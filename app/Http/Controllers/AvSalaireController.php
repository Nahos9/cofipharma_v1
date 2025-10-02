<?php

namespace App\Http\Controllers;

use App\Mail\CreateAvSalaireMail;
use App\Mail\DemandeAvSalaireMail;
use App\Mail\ValidateAvSalaireMail;
use App\Models\AvSalaire;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use PhpOffice\PhpWord\TemplateProcessor;
use App\Models\PieceJointAv;

class AvSalaireController extends Controller
{
    public function index()
    {
        return Inertia::render('AvSalaire', [
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    public function previewContractDocx(Request $request)
    {
        $data = $request->query();
        $validator = Validator::make($data, [
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'numero_compte' => ['required', 'string', 'regex:/^371[0-9]+$/', 'max:50'],
            'email' => 'required|email|max:255',
            'montant' => 'required',
            'phone' => 'nullable|string|max:20',
            'mode_paiement' => 'nullable|string|max:50',
            'public_base' => 'nullable|string',
            'signature_relative_path' => 'nullable|string',
            'bp' => 'nullable|string',
            'employeur' => 'nullable|string',
            'civility' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'piece_identite' => 'nullable|string',
            'numero_piece_identite' => 'nullable|string',
            'date_de_delivrance_piece_identite' => 'nullable|string',
            'date_naissance' => 'nullable|string',
            'lieu_naissance' => 'nullable|string',
            'nationalite' => 'nullable|string',
            'profession' => 'nullable|string',
        ]);
        if ($validator->fails()) {
            return response()->json(['error' => 'Paramètres invalides', 'messages' => $validator->errors()], 422);
        }

        $templateCandidates = [
            resource_path('contracts/Contrat.docx'),
            resource_path('contracts/contrat.docx'),
        ];
        $templatePath = null;
        foreach ($templateCandidates as $candidate) {
            if (file_exists($candidate)) { $templatePath = $candidate; break; }
        }
        if (!$templatePath) {
            return response()->json(['error' => 'Modèle de contrat introuvable.'], 404);
        }

        $tmpDocx = tempnam(sys_get_temp_dir(), 'preview_');

        try {
            $processor = new TemplateProcessor($templatePath);

            $piece_identites = [
                'cni' => "Carte nationale d'identité",
                'passport' => 'Passport',
                'permis de conduire' => 'Permis de conduire',
                'cart_sej' => 'Carte de séjour',
            ];
            $piece = '';
            if (($data['piece_identite'] ?? '') === 'cni' || ($data['piece_identite'] ?? '') === 'cart_sej') {
                $piece = 'de la';
            } elseif (($data['piece_identite'] ?? '') === 'passport' || ($data['piece_identite'] ?? '') === 'permis de conduire') {
                $piece = 'du';
            }

            $processor->setValue('first_name', $data['first_name'] ?? '');
            $processor->setValue('last_name', $data['last_name'] ?? '');
            $processor->setValue('email', $data['email'] ?? '');
            $processor->setValue('numero_compte', $data['numero_compte'] ?? '');
            $processor->setValue('montant', (string) ($data['montant'] ?? ''));
            $processor->setValue('phone', $data['phone'] ?? '');
            $processor->setValue('mode_paiement', $data['mode_paiement'] ?? '');
            $processor->setValue('date', now()->format('d/m/Y'));
            $processor->setValue('bp', $data['bp'] ?? '');
            $processor->setValue('employeur', $data['employeur'] ?? '');
            $processor->setValue('civility', $data['civility'] ?? '');
            $processor->setValue('address', $data['address'] ?? '');
            $processor->setValue('city', $data['city'] ?? '');
            $processor->setValue('piece_identite', $piece_identites[$data['piece_identite']] ?? '');
            $processor->setValue('numero_piece_identite', $data['numero_piece_identite'] ?? '');
            $processor->setValue('date_de_delivrance_piece_identite', $data['date_de_delivrance_piece_identite'] ?? '');
            if (!empty($data['date_naissance'])) {
                try { $processor->setValue('date_naissance', Carbon::parse($data['date_naissance'])->format('d/m/Y')); }
                catch (\Throwable $e) { $processor->setValue('date_naissance', $data['date_naissance']); }
            } else {
                $processor->setValue('date_naissance', '');
            }
            $processor->setValue('lieu_naissance', $data['lieu_naissance'] ?? '');
            $processor->setValue('nationalite', $data['nationalite'] ?? '');
            $processor->setValue('profession', $data['profession'] ?? '');
            $processor->setValue('piece', $piece ?? '');

            // Pas d'image de signature pour l'avance
            $processor->setValue('signature', '');

            $processor->saveAs($tmpDocx);

            $storedDir = 'previews/contracts';
            $storedName = 'contrat_preview_' . uniqid() . '.docx';
            $storedPath = $storedDir . '/' . $storedName;
            Storage::disk('public')->put($storedPath, file_get_contents($tmpDocx));
        } catch (\Throwable $e) {
            if (is_file($tmpDocx)) { @unlink($tmpDocx); }
            Log::error('Erreur génération preview DOCX Avance: ' . $e->getMessage());
            return response()->json(['error' => 'Erreur lors de la génération de la preview du contrat.'], 500);
        }

        if (is_file($tmpDocx)) { @unlink($tmpDocx); }

        $publicBase = $data['public_base'] ?? config('app.url');
        $publicBase = rtrim((string) $publicBase, '/');
        $docxRelativeUrl = '/storage/' . ltrim($storedPath, '/');
        $docxUrl = $publicBase . $docxRelativeUrl;

        $googleViewUrl = 'https://docs.google.com/gview?embedded=1&url=' . urlencode($docxUrl);
        $officeViewUrl = 'https://view.officeapps.live.com/op/view.aspx?src=' . urlencode($docxUrl);

        return response()->json([
            'docxUrl' => $docxUrl,
            'docxRelativeUrl' => $docxRelativeUrl,
            'googleViewUrl' => $googleViewUrl,
            'officeViewUrl' => $officeViewUrl,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'numero_compte' => 'required|string|regex:/^371[0-9]+$/|max:50',
            'montant' => 'required|numeric|min:1',
            'fichiers' => 'nullable|array',
            'fichiers.*' => 'file|max:5120', // 5 Mo max par fichier
        ], [
            'nom.required' => 'Le nom est obligatoire.',
            'nom.string' => 'Le nom doit être une chaîne de caractères.',
            'nom.max' => 'Le nom ne peut pas dépasser 255 caractères.',

            'prenom.required' => 'Le prénom est obligatoire.',
            'prenom.string' => 'Le prénom doit être une chaîne de caractères.',
            'prenom.max' => 'Le prénom ne peut pas dépasser 255 caractères.',

            'email.required' => 'L\'adresse email est obligatoire.',
            'email.email' => 'Veuillez saisir une adresse email valide.',
            'email.max' => 'L\'adresse email ne peut pas dépasser 255 caractères.',

            'phone.required' => 'Le numéro de téléphone est obligatoire.',
            'phone.string' => 'Le numéro de téléphone doit être une chaîne de caractères.',
            'phone.max' => 'Le numéro de téléphone ne peut pas dépasser 20 caractères.',

            'numero_compte.required' => 'Le numéro de compte est obligatoire.',
            'numero_compte.string' => 'Le numéro de compte doit être une chaîne de caractères.',
            'numero_compte.regex' => 'Le numéro de compte doit commencer par 371 et contenir uniquement des chiffres.',
            'numero_compte.max' => 'Le numéro de compte ne peut pas dépasser 50 caractères.',

            'montant.required' => 'Le montant est obligatoire.',
            'montant.numeric' => 'Le montant doit être un nombre.',
            'montant.min' => 'Le montant doit être supérieur à 0.',

            'fichiers.array' => 'Les fichiers doivent être sélectionnés correctement.',
            'fichiers.*.file' => 'Chaque fichier doit être un fichier valide.',
            'fichiers.*.max' => 'Chaque fichier ne peut pas dépasser 5 Mo.',
        ]);

        try {
            // Création de l'avance sur salaire
            $avSalaire = new \App\Models\AvSalaire();
            $avSalaire->nom = $validated['nom'];
            $avSalaire->prenom = $validated['prenom'];
            $avSalaire->email = $validated['email'];
            $avSalaire->phone = $validated['phone'];
            $avSalaire->numero_compte = $validated['numero_compte'];
            $avSalaire->montant = $validated['montant'];
            $avSalaire->status = 'en attente';
            $avSalaire->mode_paiement = $request->mode_paiement;
            $avSalaire->carte = $request->carte;
            $avSalaire->civility = $request->civility;
            $avSalaire->address = $request->address;
            $avSalaire->city = $request->city;
            $avSalaire->bp = $request->bp;
            $avSalaire->employeur = $request->employeur;
            $avSalaire->piece_identite = $request->piece_identite;
            $avSalaire->numero_piece_identite = $request->numero_piece_identite;
            $avSalaire->date_de_delivrance_piece_identite = $request->date_de_delivrance_piece_identite;
            $avSalaire->date_naissance = $request->date_naissance;
            $avSalaire->lieu_naissance = $request->lieu_naissance;
            $avSalaire->nationalite = $request->nationalite;
            $avSalaire->profession = $request->profession;
            $avSalaire->mention_text = $request->mention_text;
            $avSalaire->mention_accepted = $request->mention_accepted;
            $avSalaire->mention_accepted_at = Carbon::now();
            $avSalaire->user_validateur_level = "charge client";
            $avSalaire->save();

            // Gestion des fichiers joints
            if ($request->hasFile('fichiers')) {
                foreach ($request->file('fichiers') as $file) {
                    $path = $file->store('avances_salaires', 'public');
                    PieceJointAv::create([
                        'av_salaire_id' => $avSalaire->id,
                        'chemin_fichier' => $path,
                        'nom_fichier' => $file->getClientOriginalName(),
                        'type_mime' => $file->getClientOriginalExtension(),
                        'taille_fichier' => $file->getSize(),
                    ]);
                }
            }

            // Génération et enregistrement du contrat DOCX associé à l'avance
            try {
                $templateCandidates = [
                    resource_path('contracts/Contrat.docx'),
                    resource_path('contracts/contrat.docx'),
                ];
                $templatePath = null;
                foreach ($templateCandidates as $candidate) {
                    if (file_exists($candidate)) { $templatePath = $candidate; break; }
                }
                if ($templatePath) {
                    $processor = new TemplateProcessor($templatePath);
                    $piece_identites = [
                        'cni' => "Carte nationale d'identité",
                        'passport' => 'Passport',
                        'permis de conduire' => 'Permis de conduire',
                        'cart_sej' => 'Carte de séjour',
                    ];
                    $piece = '';
                    if (($request->input('piece_identite')) === 'cni' || ($request->input('piece_identite')) === 'cart_sej') {
                        $piece = 'de la';
                    } elseif (($request->input('piece_identite')) === 'passport' || ($request->input('piece_identite')) === 'permis de conduire') {
                        $piece = 'du';
                    }
                    $processor->setValue('first_name', $avSalaire->prenom ?? '');
                    $processor->setValue('last_name', $avSalaire->nom ?? '');
                    $processor->setValue('email', $avSalaire->email ?? '');
                    $processor->setValue('numero_compte', $avSalaire->numero_compte ?? '');
                    $processor->setValue('montant', (string) $avSalaire->montant);
                    $processor->setValue('phone', $avSalaire->phone ?? '');
                    $processor->setValue('mode_paiement', $request->input('mode_paiement', ''));
                    $processor->setValue('date', now()->format('d/m/Y'));
                    $processor->setValue('bp', $request->input('bp', ''));
                    $processor->setValue('employeur', $request->input('employeur', ''));
                    $processor->setValue('civility', $request->input('civility', ''));
                    $processor->setValue('address', $request->input('address', ''));
                    $processor->setValue('city', $request->input('city', ''));
                    $processor->setValue('piece_identite', $piece_identites[$request->input('piece_identite')] ?? '');
                    $processor->setValue('numero_piece_identite', $request->input('numero_piece_identite', ''));
                    $processor->setValue('date_de_delivrance_piece_identite', $request->input('date_de_delivrance_piece_identite', ''));
                    $processor->setValue('date_naissance', $request->input('date_naissance', ''));
                    $processor->setValue('lieu_naissance', $request->input('lieu_naissance', ''));
                    $processor->setValue('nationalite', $request->input('nationalite', ''));
                    $processor->setValue('profession', $request->input('profession', ''));
                    $processor->setValue('piece', $piece ?? '');

                    $tempFile = tempnam(sys_get_temp_dir(), 'docx_');
                    $processor->saveAs($tempFile);
                    $storedDir = 'avances_salaires/contrats/' . $avSalaire->id;
                    $storedName = 'contrat_' . $avSalaire->id . '_' . time() . '.docx';
                    $storedPath = $storedDir . '/' . $storedName;
                    Storage::disk('public')->put($storedPath, file_get_contents($tempFile));
                    @unlink($tempFile);

                    PieceJointAv::create([
                        'av_salaire_id' => $avSalaire->id,
                        'chemin_fichier' => $storedPath,
                        'nom_fichier' => $storedName,
                        'type_mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'taille_fichier' => Storage::disk('public')->size($storedPath),
                        'category' => 'contract',
                        'is_signed' => false,
                        'signed_at' => null,
                    ]);
                }
            } catch (\Throwable $e) {
                Log::error('Erreur génération contrat Avance: ' . $e->getMessage());
            }

           try{

            //    $avSalaire->load('pieceJointsAv');

               Mail::to('nahos.igalo@cofinacorp.com')->send(new CreateAvSalaireMail($avSalaire));

               Mail::to($avSalaire->email)->send(new DemandeAvSalaireMail($avSalaire));


           }catch(\Exception $e){
            Log::error('Erreur lors de l\'envoi de l\'email: ' . $e->getMessage());
           }
            return back()->with('success', '🎉 Félicitations ! Votre demande a été envoyée avec succès.');
        } catch (\Exception $e) {
            return back()->with('error', 'Erreur lors de la soumission de la demande: ' . $e->getMessage());
        }
    }

    public function uploadSignedContract(Request $request, $id)
    {
        $avSalaire = AvSalaire::findOrFail($id);
        // Empêcher l'ajout si un contrat signé existe déjà
        $alreadySigned = PieceJointAv::where('av_salaire_id', $avSalaire->id)
            ->where('category', 'contract')
            ->where('is_signed', true)
            ->exists();
        if ($alreadySigned) {
            return back()->with('error', 'Un contrat signé existe déjà pour cette avance.');
        }
        $request->validate([
            'signed_contract' => 'required|file|mimes:pdf,doc,docx|max:10240'
        ]);
        $file = $request->file('signed_contract');
        $path = $file->store('avances_salaires/contrats_signes/'.$avSalaire->id, 'public');

        // Marquer les précédents contrats signés? On ajoute un nouveau en tout cas
        $piece = PieceJointAv::create([
            'av_salaire_id' => $avSalaire->id,
            'chemin_fichier' => $path,
            'nom_fichier' => $file->getClientOriginalName(),
            'type_mime' => $file->getClientMimeType(),
            'taille_fichier' => $file->getSize(),
            'category' => 'contract',
            'is_signed' => true,
            'signed_at' => now(),
        ]);

        return back()->with('success', 'Contrat signé chargé avec succès.');
    }

    public function all(Request $request)
    {
    //    dd(Auth::user()->role);

        $query = AvSalaire::with('pieceJointsAv')
        ->where('is_deleted', 0);

        // Filtres optionnels
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenom', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('numero_compte', 'like', "%{$search}%");
            });
        }

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $avSalaires = $query->paginate($perPage);

       if(Auth::user()->role == "responsable_ritel" || Auth::user()->role == "chef_agence"){
        return Inertia::render('responsable_ritel/avSalaire/AllAvSalaire', [
            'avSalaires' => $avSalaires,
            'filters' => $request->only(['search', 'status', 'sort_by', 'sort_order', 'per_page']),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
       }elseif(Auth::user()->role == "charge client"){
        return Inertia::render('caissiere/avSalaire/AllAvSalaire', [
            'avSalaires' => $avSalaires,
            'filters' => $request->only(['search', 'status', 'sort_by', 'sort_order', 'per_page']),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
       }elseif(Auth::user()->role == "operation"){
        return Inertia::render('operation/avSalaire/AllAvSalaire', [
            'avSalaires' => $avSalaires,
            'filters' => $request->only(['search', 'status', 'sort_by', 'sort_order', 'per_page']),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
       }elseif(Auth::user()->role == "visiteur"){
        return Inertia::render('visiteur/avSalaire/AllAvSalaire', [
            'avSalaires' => $avSalaires,
            'filters' => $request->only(['search', 'status', 'sort_by', 'sort_order', 'per_page']),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
       }
       elseif(Auth::user()->role == "client"){
        // dd("test");
        return Inertia::render('client/avSalaire/AllAvSalaire', [
            'avSalaires' => $avSalaires,
            'filters' => $request->only(['search', 'status', 'sort_by', 'sort_order', 'per_page']),
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
       }
    }
    public function edit($id)
    {
        if(Auth::user()->role == "responsable_ritel" || Auth::user()->role == "chef_agence"){
            $avSalaire = AvSalaire::with('pieceJointsAv')->findOrFail($id);
            return Inertia::render('responsable_ritel/avSalaire/EditAvSalaire', [
                'avSalaire' => $avSalaire,
            ]);
        }
        elseif(Auth::user()->role == "charge client"){
            $avSalaire = AvSalaire::with('pieceJointsAv')->findOrFail($id);
            return Inertia::render('caissiere/avSalaire/EditAvSalaire', [
                'avSalaire' => $avSalaire,
            ]);
        }
        elseif(Auth::user()->role == "operation"){
            $avSalaire = AvSalaire::with('pieceJointsAv')->findOrFail($id);
            return Inertia::render('operation/avSalaire/EditAvSalaire', [
                'avSalaire' => $avSalaire,
            ]);
        }
        elseif(Auth::user()->role == "visiteur"){
            $avSalaire = AvSalaire::with('pieceJointsAv')->findOrFail($id);
            return Inertia::render('visiteur/avSalaire/EditAvSalaire', [
                'avSalaire' => $avSalaire,
            ]);
        }elseif(Auth::user()->role == "client"){
            $avSalaire = AvSalaire::with('pieceJointsAv')->findOrFail($id);
            return Inertia::render('client/avSalaire/EditAvSalaire', [
                'avSalaire' => $avSalaire,
            ]);
        }
        // else{
        //     return redirect()->route('avSalaire.index')->with('error', 'Vous n\'avez pas les permissions pour accéder à cette page.');
        // }
    }

    public function destroy($id)
    {
        $avSalaire = AvSalaire::with('pieceJointsAv')->findOrFail($id);
        $avSalaire->is_deleted = 1;
        // Suppression des fichiers physiques si besoin
        // foreach ($avSalaire->pieceJointsAv as $piece) {
        //     if (Storage::disk('public')->exists($piece->chemin_fichier)) {
        //         Storage::disk('public')->delete($piece->chemin_fichier);
        //     }
        //     $piece->delete();
        // }
        $avSalaire->save();
        return redirect()->back()->with('success', 'Avance sur salaire supprimée avec succès.');
    }

    public function validateAvSalaire(Request $request, $id)
    {
        // dd("ok");
        $avSalaire = AvSalaire::with('pieceJointsAv')->findOrFail($id);
        $user = Auth::user();

        $status = $request->input('status');
        // dd($status);
        if($status == "accepte" && $user->role == "charge client"){
            $avSalaire->status = 'accepte';
            $avSalaire->user_validateur_level = "responsable_ritel";
            $avSalaire->save();
            return redirect()->back()->with('success', 'Avance sur salaire validée avec succès.');
        }elseif($status == "rejete" && $user->role == "charge client"){
            $avSalaire->status = 'rejete';
            $avSalaire->user_validateur_level = $user->role;
            $avSalaire->save();
            return redirect()->back()->with('success', 'Avance sur salaire rejetée avec succès.');
        }elseif($status == "accepte" && ($user->role == "responsable_ritel" || $user->role == "chef_agence")){
            $avSalaire->status = 'accepte';
            $avSalaire->user_validateur_level = "operation";
            $avSalaire->save();
            return redirect()->back()->with('success', 'Avance sur salaire validée avec succès.');
        }elseif($status == "rejete" && ($user->role == "responsable_ritel" || $user->role == "chef_agence")){
            $avSalaire->status = 'rejete';
            $avSalaire->user_validateur_level = $user->role;
            $avSalaire->save();
            return redirect()->back()->with('success', 'Avance sur salaire rejetée avec succès.');
        }elseif($status == "debloque" && $user->role == "operation"){
            $avSalaire->status = 'debloque';
            $avSalaire->user_validateur_level = $user->role;

            try
            {
                Mail::to($avSalaire->email)->send(new ValidateAvSalaireMail($avSalaire));
            }catch(\Exception $e){
                Log::error('Erreur lors de l\'envoi de l\'email: ' . $e->getMessage());
            }

            $avSalaire->save();
            return redirect()->back()->with('success', 'Avance sur salaire débloquée avec succès.');
        }elseif($status == "rejete" && $user->role == "operation"){
            $avSalaire->status = 'rejete';
            $avSalaire->user_validateur_level = $user->role;

            try{
                Mail::to($avSalaire->email)->send(new ValidateAvSalaireMail($avSalaire));
            }catch(\Exception $e){
                Log::error('Erreur lors de l\'envoi de l\'email: ' . $e->getMessage());
            }

            $avSalaire->save();

            return redirect()->back()->with('success', 'Avance sur salaire rejetée avec succès.');
        }
    }
}
