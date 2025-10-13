<?php

namespace App\Http\Controllers;

use App\Http\Requests\DemandePostRequest;
use App\Mail\DemandeCreatedMail;
use App\Mail\DemandeMail;
use App\Mail\ValidationMail;
use App\Models\Demande;
use App\Models\PieceJointe;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use PhpOffice\PhpWord\TemplateProcessor;
use PhpOffice\PhpWord\IOFactory;

class DemandeController extends Controller
{
    public function index()
    {
        return Inertia::render('Demandes');
    }

    public function edit(Demande $demande)
    {
        // Charger les relations une seule fois
        $demande = $demande->load(['user', 'pieceJointes']);

        // Dériver une catégorie pour chaque pièce jointe (signature, contract, other)
        if ($demande->relationLoaded('pieceJointes') && $demande->pieceJointes) {
            $demande->pieceJointes->transform(function ($piece) {
                $name = strtolower($piece->nom_fichier ?? '');
                $mime = strtolower($piece->type_mime ?? '');

                $isSignature = (strpos($name, 'signature_') === 0) || (strpos($name, 'signature') !== false);
                $isContract = (strpos($name, 'contrat') !== false)
                    || (strpos($name, 'contract') !== false)
                    || ($mime === 'application/pdf');

                if ($isSignature) {
                    $piece->setAttribute('category', 'signature');
                } elseif ($isContract) {
                    $piece->setAttribute('category', 'contract');
                } else {
                    $piece->setAttribute('category', 'other');
                }
                return $piece;
            });
        }

        if(Auth::user()->role == "responsable_ritel" || Auth::user()->role == "chef_agence"){
            return Inertia::render('responsable_ritel/demandes/EditDemande', [
                'demande' => $demande
            ]);
        }elseif(Auth::user()->role == "visiteur"){
            return Inertia::render('visiteur/demandes/EditDemande', [
                'demande' => $demande
            ]);
        }elseif(Auth::user()->role == "charge client"){
            return Inertia::render('caissiere/demandes/EditDemande', [
                'demande' => $demande
            ]);
        }elseif(Auth::user()->role == "client"){
            return Inertia::render('client/demandes/EditDemande', [
                'demande' => $demande
            ]);
        }else{
            return Inertia::render('operation/demandes/EditDemande', [
                'demande' => $demande
            ]);
        }
    }

    public function update(Request $request, Demande $demande)
    {
        $validated = $request->validate([
            'type' => 'required|string|max:255',
            'status' => 'required|in:pending,approved,rejected',
            'description' => 'required|string'
        ]);

        $demande->update($validated);

        return redirect()->route('demandes.index')
            ->with('success', 'La demande a été mise à jour avec succès.');
    }

    public function deleteMultiple(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:demandes,id'
        ]);

        Demande::whereIn('id', $request->ids)->delete();

        return redirect()->back()
            ->with('success', 'Les demandes ont été supprimées avec succès.');
    }

    public function store(Request $request)
    {
        $messages = [
            'first_name.required' => 'Le prénom est obligatoire',
            'first_name.string' => 'Le prénom doit être une chaîne de caractères',
            'first_name.max' => 'Le prénom ne doit pas dépasser 255 caractères',
            // 'last_name.required' => 'Le nom est obligatoire',
            // 'last_name.string' => 'Le nom doit être une chaîne de caractères',
            'last_name.max' => 'Le nom ne doit pas dépasser 255 caractères',
            'numero_compte.required' => 'Le numéro de compte est obligatoire',
            'numero_compte.string' => 'Le numéro de compte doit être une chaîne de caractères',
            'numero_compte.regex' => 'Le numéro de compte doit commencer par 371 et contenir uniquement des chiffres',
            'numero_compte.max' => 'Le numéro de compte ne doit pas dépasser 50 caractères',
            'email.required' => 'L\'email est obligatoire',
            'email.email' => 'L\'email doit être une adresse email valide',
            'email.max' => 'L\'email ne doit pas dépasser 255 caractères',
            'montant.required' => 'Le montant est obligatoire',
            'montant.numeric' => 'Le montant doit être un nombre',
            'phone.required' => 'Le numéro de téléphone est obligatoire',
            'phone.string' => 'Le numéro de téléphone doit être une chaîne de caractères',
            'phone.max' => 'Le numéro de téléphone ne doit pas dépasser 20 caractères',
            'files.*.file' => 'Le fichier doit être un fichier valide',
            'files.*.mimes' => 'Les fichiers doivent être de type : pdf, jpg, jpeg, png',
            'files.*.max' => 'Les fichiers ne doivent pas dépasser 10 Mo'
        ];

        $request->validate([
            'first_name' => 'required|string|max:255',
            // 'last_name' => 'required|string|max:255',
            'numero_compte' => ['required', 'string', 'regex:/^371[0-9]+$/', 'max:50'],
            'email' => 'required|email|max:255',
            'montant' => 'required|numeric',
            'phone' => 'required|string|max:20',
            // Champs additionnels (facultatifs)
            'civility' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'bp' => 'nullable|string|max:50',
            'piece_identite' => 'nullable|string|max:100',
            'numero_piece_identite' => 'nullable|string|max:100',
            'date_naissance' => 'nullable|date',
            'date_de_delivrance_piece_identite' => 'nullable|date',
            'lieu_naissance' => 'nullable|string|max:255',
            'nationalite' => 'nullable|string|max:100',
            'profession' => 'nullable|string|max:100',
            'employeur' => 'nullable|string|max:255',
            'files.*' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:20240', // max 10MB par fichier
            'signature' => 'nullable|file|mimes:png,jpg,jpeg|max:10240',
            // Acceptation
            'mention_text' => 'required|string|min:5',
            'mention_accepted' => 'required|boolean'
        ], $messages);

        // Création de la demande
        // dd($request->all());
        // dd($request->all(["carte"]));
        $demande = Demande::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'numero_compte' => $request->numero_compte,
            'montant' => $request->montant,
            'numero_carte'=> $request->carte ?? null,
            'mode_paiement'=>$request->mode_paiement,
            'phone' => $request->phone,
            'dure' => "1",
            'user_validateur_level' => "charge client",
            // Champs additionnels
            'civility' => $request->civility,
            'address' => $request->address,
            'city' => $request->city,
            'bp' => $request->bp,
            'piece_identite' => $request->piece_identite,
            'numero_piece_identite' => $request->numero_piece_identite,
            'date_de_delivrance_piece_identite' => $request->date_de_delivrance_piece_identite,
            'date_naissance' => $request->date_naissance,
            'lieu_naissance' => $request->lieu_naissance,
            'nationalite' => $request->nationalite,
            'profession' => $request->profession,
            'employeur' => $request->employeur,
            'numero_carte' => $request->carte,
            'user_id' => Auth::user()->id,
            // Acceptation
            'mention_text' => $request->mention_text,
            'mention_accepted' => (bool) $request->boolean('mention_accepted'),
            'mention_accepted_at' => now(),
        ]);

        // Traitement des fichiers
        $sigPath = null;
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                // Stockage du fichier
                $path = $file->store('piece_jointes/' . $demande->id, 'public');

                // Création de l'enregistrement dans la table piece_jointes
                PieceJointe::create([
                    'demande_id' => $demande->id,
                    'nom_fichier' => $file->getClientOriginalName(),
                    'chemin_fichier' => $path,
                    'type_mime' => $file->getMimeType(),
                    'taille_fichier' => $file->getSize()
                ]);
            }
        }

        // Upload de la signature si fournie
        if ($request->hasFile('signature')) {
            $signature = $request->file('signature');
            $sigPath = $signature->store('piece_jointes/' . $demande->id, 'public');
            PieceJointe::create([
                'demande_id' => $demande->id,
                'nom_fichier' => 'signature_' . $demande->id . '.' . $signature->getClientOriginalExtension(),
                'chemin_fichier' => $sigPath,
                'type_mime' => $signature->getMimeType(),
                'taille_fichier' => $signature->getSize()
            ]);
        }

        // Génération du contrat DOCX depuis un modèle si disponible
        try {
            $templatePath = resource_path('contracts/contrat.docx');
            $piece_identites = ["cni" => "Carte nationale d'identité", "passport" => "Passport", "permis de conduire" => "Permis de conduire", "cart_sej" => "Carte de séjour"];
            $piece = "";
            if($demande->piece_identite == "cni" || $demande->piece_identite == "cart_sej"){
                $piece = "de la";
            }elseif($demande->piece_identite == "passport" || $demande->piece_identite == "permis de conduire"){
                $piece = "du";
            }

            if (file_exists($templatePath)) {
                $template = new TemplateProcessor($templatePath);
                $template->setValue('first_name', $demande->first_name ?? '');
                $template->setValue('last_name', $demande->last_name ?? '');
                $template->setValue('email', $demande->email ?? '');
                $template->setValue('numero_compte', $demande->numero_compte ?? '');
                $template->setValue('montant', (string) $demande->montant);
                $template->setValue('phone', $demande->phone ?? '');
                $template->setValue('mode_paiement', $demande->mode_paiement ?? '');
                $template->setValue('date', now()->format('d/m/Y'));
                $template->setValue('bp', $demande->bp ?? '');
                $template->setValue('employeur', $demande->employeur ?? '');
                $template->setValue('civility', $demande->civility ?? '');
                $template->setValue('address', $demande->address ?? '');
                $template->setValue('city', $demande->city ?? '');
                $template->setValue('piece_identite', $piece_identites[$demande->piece_identite] ?? '');
                $template->setValue('numero_piece_identite', $demande->numero_piece_identite ?? '');
                $template->setValue('date_de_delivrance_piece_identite', $demande->date_de_delivrance_piece_identite ?? '');
                $template->setValue('date_naissance', $demande->date_naissance ?? '');
                $template->setValue('lieu_naissance', $demande->lieu_naissance ?? '');
                $template->setValue('nationalite', $demande->nationalite ?? '');
                $template->setValue('profession', $demande->profession ?? '');
                $template->setValue('employeur', $demande->employeur ?? '');
                $template->setValue('piece', $piece ?? '');

                // Insérer l'image de signature si disponible
                if (!empty($sigPath)) {
                    $absoluteSigPath = storage_path('app/public/' . ltrim($sigPath, '/'));
                    if (file_exists($absoluteSigPath)) {
                        $template->setImageValue('signature', [
                            'path' => $absoluteSigPath,
                            'width' => 200,
                            'height' => 80,
                            'ratio' => true,
                        ]);
                    } else {
                        $template->setValue('signature', '');
                    }
                } else {
                    $template->setValue('signature', '');
                }


                $contractDir = 'contrats/' . $demande->id;
                $contractName = 'contrat_' . $demande->id . '.docx';
                $tempFile = tempnam(sys_get_temp_dir(), 'docx_');
                // Sauvegarde temporaire
                $template->saveAs($tempFile);
                // Stockage sur disque public
                $storedPath = $contractDir . '/' . $contractName;
                Storage::disk('public')->put($storedPath, file_get_contents($tempFile));
                @unlink($tempFile);

                // Enregistrer comme pièce jointe
                PieceJointe::create([
                    'demande_id' => $demande->id,
                    'nom_fichier' => $contractName,
                    'chemin_fichier' => $storedPath,
                    'type_mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'taille_fichier' => Storage::disk('public')->size($storedPath),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Erreur génération contrat DOCX: ' . $e->getMessage());
        }

        try {
            // Charger la relation pieceJointes avant d'envoyer l'email
            $demande->load('pieceJointes');

            // Envoyer l'email à l'administrateur
            Mail::to("nahos.igalo@cofinacorp.com")->send(new DemandeMail($demande));

            // Envoyer l'email de confirmation au demandeur
            Mail::to($demande->email)->send(new DemandeCreatedMail($demande));
        } catch (\Exception $e) {
            // Log l'erreur mais continuer l'exécution
            Log::error('Erreur lors de l\'envoi de l\'email: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Demande créée avec succès');
    }

    public function destroy(Demande $demande)
    {
        $demande["is_deleted"] = 1;
        $demande->save();
        return redirect()->route('demande.all')
        ->with('success', 'La demande a été supprimé avec succès.');
    }
    public function validateOrReject (Request $request,Demande $demande)
    {
        $user = Auth::user();
        // dd($user->name);
        $status = $request->input('status');
        // dd($status);
        if($status == "accepte" && $user->role == "charge client"){
            $demande["status"] = $status;
            $demande["user_validateur_level"] = "responsable_ritel";
            $demande->save();
        //    try {
        //     Mail::to($demande->email)->send(new ValidationMail($demande));
        //    } catch (\Throwable $th) {

        //    }
            return redirect()->route('caissiere.demandes.all')->with('success','La demande a été validée avec success');

        }elseif($status == "rejete" && $user->role == "charge client"){
            // dd($status);
            $demande["status"] = $status;
            $demande["user_validateur_level"] = $user->role;
            $demande->save();
            // try {
            //     Mail::to($demande->email)->send(new ValidationMail($demande));
            //    } catch (\Throwable $th) {

            //    }
            return redirect()->route('caissiere.demandes.all')->with('success','La demande a été rejetée avec success');
        }elseif($status == "accepte" && ($user->role == "responsable_ritel" || $user->role == "chef_agence")){
            $demande["status"] = $status;
            $demande["user_validateur_level"] = "operation";
            $demande->save();
            //  try {
            //     Mail::to($demande->email)->send(new ValidationMail($demande));
            // } catch (\Throwable $th) {

            // }
            return redirect()->route('responsable_ritel.demandes.all')->with('success','La demande a été acceptée avec success');

        }elseif($status == "rejete" && $user->role == "responsable_ritel"){
            $demande["status"] = $status;
            $demande["user_validateur_level"] = $user->role;
            $demande->save();
            // try {
            //     Mail::to($demande->email)->send(new ValidationMail($demande));
            //    } catch (\Throwable $th) {

            //    }
            return redirect()->route('operation.demandes.all')->with('success','La demande a été rejetée avec success');
        }elseif($status == "debloque" && $user->role == "operation"){
            $demande["status"] = $status;
            $demande["user_validateur_level"] = $user->role;
            $demande->save();
            try {
                Mail::to($demande->email)->send(new ValidationMail($demande));
               } catch (\Throwable $th) {

               }
            return redirect()->route('operation.demandes.all')->with('success','La demande a été debloquée avec success');
        }elseif($status == "rejete" && $user->role == "operation"){
            $demande["status"] = $status;
            $demande["user_validateur_level"] = $user->role;
            $demande->save();
            try {
                Mail::to($demande->email)->send(new ValidationMail($demande));
               } catch (\Throwable $th) {

               }
            return redirect()->route('operation.demandes.all')->with('success','La demande a été rejetée avec success');
        }

    }

    public function uploadSignedContract(Request $request, Demande $demande)
    {
        $request->validate([
            'signed_contract' => 'required|file|mimes:pdf,doc,docx|max:10240',
            'source_contract_id' => 'nullable|exists:piece_jointes,id',
        ]);

        // Empêcher l'upload d'un second contrat signé
        $hasSignedContract = PieceJointe::where('demande_id', $demande->id)
            ->where('chemin_fichier', 'like', 'contrats_signes/' . $demande->id . '/%')
            ->exists();

        if ($hasSignedContract) {
            return redirect()->back()->withErrors([
                'signed_contract' => 'Un contrat signé existe déjà pour cette demande.'
            ]);
        }

        $file = $request->file('signed_contract');

        $storedPath = $file->store('contrats_signes/' . $demande->id, 'public');

        $pieceJointe = PieceJointe::create([
            'demande_id' => $demande->id,
            'nom_fichier' => 'contrat_signe_' . $demande->id . '.' . $file->getClientOriginalExtension(),
            'chemin_fichier' => $storedPath,
            'type_mime' => $file->getMimeType(),
            'taille_fichier' => $file->getSize()
        ]);

        return redirect()->back()->with('success', 'Contrat signé téléversé avec succès');
    }

    public function saveMention(Request $request, Demande $demande)
    {
        $validated = $request->validate([
            'mention_text' => 'required|string|min:5',
            'mention_accepted' => 'required|boolean',
        ]);

        if (!$validated['mention_accepted']) {
            return redirect()->back()->withErrors([
                'mention_accepted' => 'Vous devez accepter la mention.'
            ]);
        }

        $demande->mention_text = $validated['mention_text'];
        $demande->mention_accepted = true;
        $demande->mention_accepted_at = now();
        $demande->save();

        return redirect()->back()->with('success', 'Mention enregistrée avec succès');
    }
    public function all(Request $request)
    {
        $query = Demande::with('user')
        ->when($request->search, function($query) use ($request) {
            $query->where(function($q) use ($request) {
                $q->whereHas('user', function($q) use ($request) {
                    $q->where('first_name', 'like', "%{$request->search}%");
                })
                ->orWhere('montant', 'like', "%{$request->search}%")
                ->orWhere('last_name', 'like', "%{$request->search}%");
            });
        })
        ->when($request->status, function($query) use ($request) {
            $query->where('status', $request->status);
        })
        ->where('is_deleted',0)
        ->latest();

        $demandes = $query->paginate(10)
            ->withQueryString();

        if(Auth::user()->role == "operation"){
                return Inertia::render('operation/demandes/AllDemandes', [
                    'demandes' => $demandes,
                    'filters' => $request->only(['search', 'status'])
                ]);
        }
        if(Auth::user()->role == "charge client"){
            return Inertia::render('caissiere/demandes/AllDemandes', [
                'demandes' => $demandes,
                'filters' => $request->only(['search', 'status'])
            ]);
        }
        if(Auth::user()->role == "visiteur"){
            return Inertia::render('visiteur/demandes/AllDemandes', [
                'demandes' => $demandes,
                'filters' => $request->only(['search', 'status'])
            ]);
        }
        if(Auth::user()->role == "client"){
            $query = Demande::with('user')
            ->when($request->search, function($query) use ($request) {
                $query->where(function($q) use ($request) {
                    $q->whereHas('user', function($q) use ($request) {
                        $q->where('first_name', 'like', "%{$request->search}%");
                    })
                    ->orWhere('montant', 'like', "%{$request->search}%")
                    ->orWhere('last_name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
                });
            })
            ->when($request->status, function($query) use ($request) {
                $query->where('status', $request->status);
            })
            ->where('is_deleted',0)
            ->where('user_id', Auth::user()->id)
            ->latest();

        $demandes = $query->paginate(10)
            ->withQueryString();
            return Inertia::render('client/demandes/AllDemandes', [
                'demandes' => $demandes,
                'filters' => $request->only(['search', 'status'])
            ]);
        }
        return Inertia::render('demandes/AllDemandes', [
            'demandes' => $demandes,
            'filters' => $request->only(['search', 'status'])
         ]);

    }

    public function allDemandesResponsable(Request $request)
    {
        $query = Demande::with('user')
        ->when($request->search, function($query) use ($request) {
            $query->where(function($q) use ($request) {
                $q->whereHas('user', function($q) use ($request) {
                    $q->where('first_name', 'like', "%{$request->search}%");
                })
                ->orWhere('montant', 'like', "%{$request->search}%")
                ->orWhere('last_name', 'like', "%{$request->search}%");
            });
        })
        ->when($request->status, function($query) use ($request) {
            $query->where('status', $request->status);
        })
        ->where('is_deleted',0)
        ->latest();

        $demandes = $query->paginate(10)
            ->withQueryString();

        return Inertia::render('responsable_ritel/demandes/AllDemandes', [
            'demandes' => $demandes,
            'filters' => $request->only(['search', 'status'])
    ]);
    }

    public function statistics(Request $request)
    {
        $dateDebut = $request->input('date_debut', now()->subDays(7)->format('Y-m-d'));
        $dateFin = $request->input('date_fin', now()->format('Y-m-d'));

        // Statistiques des demandes par jour
        $demandesParJour = Demande::whereBetween('created_at', [$dateDebut, $dateFin])
            ->where('is_deleted', 0)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as total, SUM(montant) as montant_total')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Statistiques par statut
        $statistiquesParStatut = Demande::whereBetween('created_at', [$dateDebut, $dateFin])
            ->where('is_deleted', 0)
            ->selectRaw('status, COUNT(*) as total, SUM(montant) as montant_total')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->status => [
                    'total' => $item->total,
                    'montant_total' => $item->montant_total
                ]];
            })
            ->toArray();

        // Calcul des totaux
        $totalDemandes = array_sum(array_column($statistiquesParStatut, 'total'));
        $montantTotal = array_sum(array_column($statistiquesParStatut, 'montant_total'));

        $demandesEnAttente = $statistiquesParStatut['en attente']['total'] ?? 0;
        $demandesValidees = $statistiquesParStatut['accepte']['total'] ?? 0;
        $demandesRejetees = $statistiquesParStatut['rejete']['total'] ?? 0;
        $demandesDebloquees = $statistiquesParStatut['debloque']['total'] ?? 0;

        // Montants par statut
        $montantEnAttente = $statistiquesParStatut['en attente']['montant_total'] ?? 0;
        $montantValide = $statistiquesParStatut['accepte']['montant_total'] ?? 0;
        $montantRejete = $statistiquesParStatut['rejete']['montant_total'] ?? 0;
        $montantDebloque = $statistiquesParStatut['debloque']['montant_total'] ?? 0;

        // Moyenne des montants
        $moyenneMontant = $totalDemandes > 0 ? $montantTotal / $totalDemandes : 0;

        return Inertia::render('Statistics', [
            'statistiques' => [
                'demandesParJour' => $demandesParJour,
                'totalDemandes' => $totalDemandes,
                'montantTotal' => $montantTotal,
                'moyenneMontant' => $moyenneMontant,
                'demandesEnAttente' => $demandesEnAttente,
                'demandesValidees' => $demandesValidees,
                'demandesRejetees' => $demandesRejetees,
                'demandesDebloquees' => $demandesDebloquees,
                'montantEnAttente' => $montantEnAttente,
                'montantValide' => $montantValide,
                'montantRejete' => $montantRejete,
                'montantDebloque' => $montantDebloque,
                'filtres' => [
                    'date_debut' => $dateDebut,
                    'date_fin' => $dateFin
                ]
            ]
        ]);
    }

    public function exportStatistics(Request $request)
    {
        $dateDebut = $request->input('date_debut', now()->subDays(7)->format('Y-m-d'));
        $dateFin = $request->input('date_fin', now()->format('Y-m-d'));

        $demandes = Demande::whereBetween('created_at', [$dateDebut, $dateFin])
            ->where('is_deleted', 0)
            ->with('user')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="statistiques_demandes.csv"',
        ];

        $callback = function() use ($demandes) {
            $file = fopen('php://output', 'w');

            // En-têtes
            fputcsv($file, [
                'Date',
                'Nom',
                'Prenom',
                'Email',
                'Numero de compte',
                'Montant',
                'Statut',
                'Telephone'
            ]);

            // Données
            foreach ($demandes as $demande) {
                fputcsv($file, [
                    $demande->created_at->format('Y-m-d H:i:s'),
                    $demande->last_name,
                    $demande->first_name,
                    $demande->email,
                    $demande->numero_compte,
                    $demande->montant,
                    $demande->status,
                    $demande->phone
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function allDemandesDebloques(Request $request)
    {
        $query = Demande::with('user')
        ->when($request->search, function($query) use ($request) {
            $query->where(function($q) use ($request) {
                $q->whereHas('user', function($q) use ($request) {
                    $q->where('first_name', 'like', "%{$request->search}%");
                })
                ->orWhere('montant', 'like', "%{$request->search}%")
                ->orWhere('last_name', 'like', "%{$request->search}%");
            });
        })
        ->when($request->status, function($query) use ($request) {
            $query->where('status', $request->status);
        })
        ->where('is_deleted',0)
        ->where('status', 'debloque')
        ->latest();

        $demandes = $query->paginate(10)
            ->withQueryString();

       if(Auth::user()->role == "visiteur"){
        return Inertia::render('visiteur/demandes/AllDemandesDebloques', [
            'demandes' => $demandes,
            'filters' => $request->only(['search', 'status'])
        ]);
       }
       return Inertia::render('responsable_ritel/demandes/AllDemandesDebloques', [
        'demandes' => $demandes,
        'filters' => $request->only(['search', 'status'])
       ]);
    }
    public function allDemandesRejetees(Request $request)
    {
        $query = Demande::with('user')
        ->when($request->search, function($query) use ($request) {
            $query->where(function($q) use ($request) {
                $q->whereHas('user', function($q) use ($request) {
                    $q->where('first_name', 'like', "%{$request->search}%");
                })
                ->orWhere('montant', 'like', "%{$request->search}%")
                ->orWhere('last_name', 'like', "%{$request->search}%");
            });
        })
        ->when($request->status, function($query) use ($request) {
            $query->where('status', $request->status);
        })
        ->where('is_deleted',0)
        ->where('status', 'rejete')
        ->latest();

        $demandes = $query->paginate(10)
            ->withQueryString();

       if(Auth::user()->role == "visiteur"){
        return Inertia::render('visiteur/demandes/AllDemandesRejetees', [
            'demandes' => $demandes,
            'filters' => $request->only(['search', 'status'])
        ]);
       }
       return Inertia::render('responsable_ritel/demandes/AllDemandesRejetees', [
        'demandes' => $demandes,
        'filters' => $request->only(['search', 'status'])
       ]);
    }
    public function allDemandesAcceptees(Request $request)
    {
        $query = Demande::with('user')
        ->when($request->search, function($query) use ($request) {
            $query->where(function($q) use ($request) {
                $q->whereHas('user', function($q) use ($request) {
                    $q->where('first_name', 'like', "%{$request->search}%");
                })
                ->orWhere('montant', 'like', "%{$request->search}%")
                ->orWhere('last_name', 'like', "%{$request->search}%");
            });
        })
        ->when($request->status, function($query) use ($request) {
            $query->where('status', $request->status);
        })
        ->where('is_deleted',0)
        ->where('status', 'accepte')
        ->latest();

        $demandes = $query->paginate(10)
            ->withQueryString();

       if(Auth::user()->role == "visiteur"){
        return Inertia::render('visiteur/demandes/AllDemandesAcceptees', [
            'demandes' => $demandes,
            'filters' => $request->only(['search', 'status'])
        ]);
       }
       return Inertia::render('responsable_ritel/demandes/AllDemandesAcceptees', [
        'demandes' => $demandes,
        'filters' => $request->only(['search', 'status'])
       ]);
    }
    public function allDemandesEnAttente(Request $request)
    {
        $query = Demande::with('user')
        ->when($request->search, function($query) use ($request) {
            $query->where(function($q) use ($request) {
                $q->whereHas('user', function($q) use ($request) {
                    $q->where('first_name', 'like', "%{$request->search}%");
                })
                ->orWhere('montant', 'like', "%{$request->search}%")
                ->orWhere('last_name', 'like', "%{$request->search}%");
            });
        })
        ->when($request->status, function($query) use ($request) {
            $query->where('status', $request->status);
        })
        ->where('is_deleted',0)
        ->where('status', 'en attente')
        ->latest();
        $demandes = $query->paginate(10)
            ->withQueryString();

       if(Auth::user()->role == "visiteur"){
        return Inertia::render('visiteur/demandes/AllDemandesEnAttente', [
            'demandes' => $demandes,
            'filters' => $request->only(['search', 'status'])
        ]);
       }
        return Inertia::render('responsable_ritel/demandes/AllDemandesEnAttente', [
        'demandes' => $demandes,
        'filters' => $request->only(['search', 'status'])
       ]);
    }

    public function previewContract(Request $request)
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

        ]);
        if ($validator->fails()) {
            return response()->json(['error' => 'Paramètres invalides', 'messages' => $validator->errors()], 422);
        }

        $templatePath = resource_path('contracts/contrat.docx');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Modèle de contrat introuvable.'], 404);
        }

        $tmpDocx = tempnam(sys_get_temp_dir(), 'preview_');
        $tmpHtml = tempnam(sys_get_temp_dir(), 'html_');

        try {
            $piece_identites = ["cni" => "Carte nationale d'identité", "passport" => "Passport", "permis de conduire" => "Permis de conduire", "cart_sej" => "Carte de séjour"];
            $piece = "";
            if($data['piece_identite'] == "cni" || $data['piece_identite'] == "cart_sej"){
                $piece = "de la";
            }elseif($data['piece_identite'] == "passport" || $data['piece_identite'] == "permis de conduire"){
                $piece = "du";
            }
            dd($piece);
            $processor = new TemplateProcessor($templatePath);
            $processor->setValue('first_name', $data['first_name'] ?? '');
            $processor->setValue('last_name', $data['last_name'] ?? '');
            $processor->setValue('email', $data['email'] ?? '');
            $processor->setValue('numero_compte', $data['numero_compte'] ?? '');
            $processor->setValue('montant', (string) ($data['montant'] ?? ''));
            $processor->setValue('phone', $data['phone'] ?? '');
            $processor->setValue('mode_paiement', $data['mode_paiement'] ?? '');
            $processor->setValue('bp', $data['bp'] ?? '');
            $processor->setValue('employeur', $data['employeur'] ?? '');
            $processor->setValue('civility', $data['civility'] ?? '');
            $processor->setValue('address', $data['address'] ?? '');
            $processor->setValue('city', $data['city'] ?? '');
            $processor->setValue('piece_identite', $piece_identites[$data['piece_identite']] ?? '');
            $processor->setValue('numero_piece_identite', $data['numero_piece_identite'] ?? '');
            $processor->setValue('date_de_delivrance_piece_identite', $data['date_de_delivrance_piece_identite'] ?? '');
            $processor->setValue('date_naissance', $data['date_naissance'] ?? '');
            $processor->setValue('lieu_naissance', $data['lieu_naissance'] ?? '');
            $processor->setValue('nationalite', $data['nationalite'] ?? '');
            $processor->setValue('profession', $data['profession'] ?? '');
            $processor->setValue('piece', $piece ?? '');
            $processor->setValue('date', now()->format('d/m/Y'));

            $processor->saveAs($tmpDocx);

            $phpWord = IOFactory::load($tmpDocx, 'Word2007');
            $htmlWriter = IOFactory::createWriter($phpWord, 'HTML');
            $htmlWriter->save($tmpHtml);

            $html = file_get_contents($tmpHtml);
            @unlink($tmpDocx);
            @unlink($tmpHtml);

            return response()->json([
                'html' => $html,
            ]);
        } catch (\Throwable $e) {
            @unlink($tmpDocx);
            @unlink($tmpHtml);
            Log::error('Erreur aperçu contrat: '.$e->getMessage());
            return response()->json(['error' => 'Impossible de générer l\'aperçu.'], 500);
        }
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

        // Chemin du template DOCX (respecte la casse du fichier existant dans resources/contracts)
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

        //pour modifier la preview du contrat c'est ici qu'il faut faire les modifications
        $piece_identites = ["cni" => "Carte nationale d'identité", "passport" => "Passport", "permis de conduire" => "Permis de conduire", "cart_sej" => "Carte de séjour"];
        $piece = "";
        if($data['piece_identite'] == "cni" || $data['piece_identite'] == "cart_sej"){
            $piece = "de la";
        }elseif($data['piece_identite'] == "passport" || $data['piece_identite'] == "permis de conduire"){
            $piece = "du";
        }

        try {
            $processor = new TemplateProcessor($templatePath);
            $processor->setValue('first_name', $data['first_name'] ?? '');
            $processor->setValue('last_name', $data['last_name'] ?? '');
            $processor->setValue('email', $data['email'] ?? '');
            $processor->setValue('numero_compte', $data['numero_compte'] ?? '');
            $processor->setValue('montant', (string) ($data['montant'] ?? ''));
            $processor->setValue('phone', $data['phone'] ?? '');
            $processor->setValue('mode_paiement', $data['mode_paiement'] ?? '');
            $processor->setValue('bp', $data['bp'] ?? '');
            $processor->setValue('employeur', $data['employeur'] ?? '');
            $processor->setValue('civility', $data['civility'] ?? '');
            $processor->setValue('address', $data['address'] ?? '');
            $processor->setValue('city', $data['city'] ?? '');
            $processor->setValue('piece_identite', $piece_identites[$data['piece_identite']] ?? '');
            $processor->setValue('numero_piece_identite', $data['numero_piece_identite'] ?? '');
            $processor->setValue('date_de_delivrance_piece_identite', Carbon::parse($data['date_de_delivrance_piece_identite'])->format('d/m/Y') ?? '');
            $processor->setValue('date_naissance', Carbon::parse($data['date_naissance'])->format('d/m/Y') ?? '');
            $processor->setValue('lieu_naissance', $data['lieu_naissance'] ?? '');
            $processor->setValue('nationalite', $data['nationalite'] ?? '');
            $processor->setValue('profession', $data['profession'] ?? '');
            $processor->setValue('piece', $piece ?? '');
            $processor->setValue('date', now()->format('d/m/Y'));


            // Signature image pour preview si fournie
            if (!empty($data['signature_relative_path'])) {
                $absoluteSigPath = storage_path('app/public/' . ltrim($data['signature_relative_path'], '/'));
                if (file_exists($absoluteSigPath)) {
                    $processor->setImageValue('signature', [
                        'path' => $absoluteSigPath,
                        'width' => 200,
                        'height' => 80,
                        'ratio' => true,
                    ]);
                } else {
                    $processor->setValue('signature', '');
                }
            } else {
                $processor->setValue('signature', '');
            }
            $processor->saveAs($tmpDocx);

            // Stocker une copie accessible publiquement pour viewers externes
            $storedDir = 'previews/contracts';
            $storedName = 'contrat_preview_' . uniqid() . '.docx';
            $storedPath = $storedDir . '/' . $storedName;
            Storage::disk('public')->put($storedPath, file_get_contents($tmpDocx));

            @unlink($tmpDocx);

            $publicBase = $data['public_base'] ?? config('app.url');
            $publicBase = rtrim((string) $publicBase, '/');
            $docxRelativeUrl = '/storage/' . ltrim($storedPath, '/');
            $docxUrl = $publicBase . $docxRelativeUrl;

            // URLs de visualisation via Google Docs et Office Online
            $googleViewUrl = 'https://docs.google.com/gview?embedded=1&url=' . urlencode($docxUrl);
            $officeViewUrl = 'https://view.officeapps.live.com/op/view.aspx?src=' . urlencode($docxUrl);

            return response()->json([
                'docx_relative_url' => $docxRelativeUrl,
                'docx_url' => $docxUrl,
                'google_view_url' => $googleViewUrl,
                'office_view_url' => $officeViewUrl,
            ]);
        } catch (\Throwable $e) {
            @unlink($tmpDocx);
            Log::error('Erreur aperçu contrat DOCX: ' . $e->getMessage());
            return response()->json(['error' => 'Impossible de générer le DOCX.'], 500);
        }
    }

    public function previewSignatureUpload(Request $request)
    {
        $request->validate([
            'signature' => 'required|file|mimes:png,jpg,jpeg|max:10240'
        ]);

        $file = $request->file('signature');
        $storedPath = $file->store('previews/signatures', 'public');

        $publicBase = rtrim((string) config('app.url'), '/');
        $relative = '/storage/' . ltrim($storedPath, '/');
        $url = $publicBase . $relative;

        return response()->json([
            'signature_relative_path' => $storedPath,
            'signature_url' => $url,
        ]);
    }
}
