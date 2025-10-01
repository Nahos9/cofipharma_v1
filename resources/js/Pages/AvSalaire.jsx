import NavigationHome from '@/Components/NavigationHome'
import React, { useEffect, useRef, useState } from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import InputLabel from '@/Components/InputLabel'
import TextInput from '@/Components/TextInput'
import InputError from '@/Components/InputError'
import PrimaryButton from '@/Components/PrimaryButton'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import FooterHome from '@/Components/FooterHome'
import { renderAsync } from 'docx-preview'

const AvSalaire = ({ auth, flash }) => {
    const { data, setData, post, processing, errors, reset } = useForm({
        // Champs requis backend AvSalaire
        numero_compte: '',
        phone: '',
        email: '',
        nom: '',
        prenom: '',
        status: '',
        montant: '',
        fichiers: [],
        // Champs complémentaires pour la preview du contrat (non envoyés au backend AvSalaire)
        civility: '',
        address: '',
        city: '',
        bp: '',
        piece_identite: '',
        numero_piece_identite: '',
        date_naissance: '',
        lieu_naissance: '',
        nationalite: '',
        profession: '',
        employeur: '',
        date_de_delivrance_piece_identite: '',
        mode_paiement: '',
        carte: '',
    })

    const [currentStep, setCurrentStep] = useState(1)
    const [acceptanceText, setAcceptanceText] = useState('')
    const [acceptTerms, setAcceptTerms] = useState(false)
    const [officeViewUrl, setOfficeViewUrl] = useState('')
    const [googleViewUrl, setGoogleViewUrl] = useState('')
    const [docxUrl, setDocxUrl] = useState('')
    const [docxRelativeUrl, setDocxRelativeUrl] = useState('')
    const [useIframePreview, setUseIframePreview] = useState(false)
    const docxContainerRef = useRef(null)
    const [previewError, setPreviewError] = useState('')

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                className: 'bg-green-500 text-white',
                bodyClassName: 'font-bold',
            });
            reset();
            setTimeout(() => {
                router.visit(route('welcome'));
            }, 1500);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const progressPercent = currentStep === 1 ? 25 : currentStep === 2 ? 50 : currentStep === 3 ? 75 : 100

    const canProceedStep1 = () => {
        return (
            data.nom && data.prenom && data.email && data.phone && data.numero_compte && data.montant
        )
    }

    const goNext = (e) => {
        e.preventDefault()
        if (currentStep === 1) {
            if (!canProceedStep1()) {
                toast.error("Veuillez compléter les champs obligatoires de l'étape 1")
                return
            }
        }
        if (currentStep === 4) return
        setCurrentStep(s => Math.min(4, s + 1))
    }

    const goPrev = (e) => {
        e.preventDefault()
        setCurrentStep(s => Math.max(1, s - 1))
    }

    const handleFinalSubmit = (e) => {
        e.preventDefault()
        if (!acceptTerms) {
            toast.error("Vous devez accepter les conditions avant de soumettre.")
            return
        }
        post(route('av_salaire.store'))
    }

    useEffect(() => {
        if (currentStep !== 3) return
        setPreviewError('')
        const params = new URLSearchParams({
            // On réutilise l’endpoint de preview DOCX des Demandes pour générer un contrat
            first_name: data.prenom || '',
            last_name: data.nom || '',
            email: data.email || '',
            numero_compte: data.numero_compte || '',
            montant: data.montant || '',
            phone: data.phone || '',
            mode_paiement: '',
            bp: data.bp || '',
            employeur: data.employeur || '',
            civility: data.civility || '',
            address: data.address || '',
            city: data.city || '',
            piece_identite: data.piece_identite || '',
            numero_piece_identite: data.numero_piece_identite || '',
            date_de_delivrance_piece_identite: data.date_de_delivrance_piece_identite || '',
            date_naissance: data.date_naissance || '',
            lieu_naissance: data.lieu_naissance || '',
            nationalite: data.nationalite || '',
            profession: data.profession || '',
        })
        const url = route('av_salaire.contracts.previewDocx') + `?${params.toString()}`
        fetch(url, { credentials: 'include' })
            .then(async (res) => {
                const json = await res.json().catch(() => null)
                if (!res.ok) {
                    const msg = (json && (json.error || json.message)) || 'Preview contrat indisponible'
                    throw new Error(msg)
                }
                return json
            })
            .then((json) => {
                setOfficeViewUrl(json.officeViewUrl || json.office_view_url || '')
                setGoogleViewUrl(json.googleViewUrl || json.google_view_url || '')
                setDocxUrl(json.docxUrl || json.docx_url || '')
                setDocxRelativeUrl(json.docxRelativeUrl || json.docx_relative_url || '')
                setUseIframePreview(false)
            })
            .catch((err) => {
                setPreviewError(err?.message || 'Preview contrat indisponible')
                setOfficeViewUrl('')
                setGoogleViewUrl('')
                setDocxUrl('')
                setDocxRelativeUrl('')
                setUseIframePreview(true)
            })
    }, [currentStep, data])

    useEffect(() => {
        const renderDocx = async () => {
            if (currentStep !== 3) return
            if (!docxRelativeUrl && !docxUrl) return
            if (!docxContainerRef.current) return
            try {
                const href = docxRelativeUrl || docxUrl
                const resp = await fetch(href, { credentials: 'same-origin' })
                if (!resp.ok) throw new Error('Docx non accessible')
                const blob = await resp.blob()
                const arrayBuffer = await blob.arrayBuffer()
                docxContainerRef.current.innerHTML = ''
                await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
                    className: 'docx-view', inWrapper: true, ignoreWidth: false, ignoreHeight: false
                })
                setUseIframePreview(false)
            } catch (err) {
                setUseIframePreview(true)
            }
        }
        renderDocx()
    }, [currentStep, docxUrl, docxRelativeUrl])

    return (
        <div>
            <NavigationHome user={auth?.user} />
            <Head title='demande avance ' />
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
            <div className="mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Demande d'Avance sur Salaire</h1>

                <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-2">
                        <span>Étape 1: Formulaire</span>
                        <span>Étape 2: Récapitulatif</span>
                        <span>Étape 3: Contrat</span>
                        <span>Étape 4: Acceptation</span>
                    </div>
                </div>

                <form onSubmit={currentStep === 4 ? handleFinalSubmit : goNext} className='border p-2 shadow-lg'>
                    {currentStep === 1 && (
                        <div>
                            <div className="mb-2">
                                <InputLabel htmlFor="civility" value="Civilité" />
                                <select id="civility" value={data.civility} onChange={(e)=> setData('civility', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md">
                                    <option value="">Sélectionnez</option>
                                    <option value="mr">Mr</option>
                                    <option value="mme">Mme</option>
                                </select>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <div className='flex-1'>
                                    <InputLabel htmlFor="nom" value="Votre nom" />
                                    <TextInput id="nom" type="text" name="nom" value={data.nom} className="mt-1 block w-full" onChange={(e) => setData('nom', e.target.value)} />
                                    <InputError message={errors.nom} className="mt-2" />
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="prenom" value="Votre prénom" />
                                    <TextInput id="prenom" type="text" name="prenom" value={data.prenom} className="mt-1 block w-full" onChange={(e) => setData('prenom', e.target.value)} />
                                    <InputError message={errors.prenom} className="mt-2" />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <div className='flex-1'>
                                    <InputLabel htmlFor="email" value="Votre email" />
                                    <TextInput id="email" type="text" name="email" value={data.email} className="mt-1 block w-full" onChange={(e) => setData('email', e.target.value)} />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="phone" value="Numéro de téléphone" />
                                    <TextInput id="phone" type="text" name="phone" value={data.phone} className="mt-1 block w-full" onChange={(e) => setData('phone', e.target.value)} />
                                    <InputError message={errors.phone} className="mt-2" />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <div className='flex-1'>
                                    <InputLabel htmlFor="numero_compte" value="Numéro de compte courant" />
                                    <TextInput
                                        id="numero_compte"
                                        type="text"
                                        name="numero_compte"
                                        value={data.numero_compte}
                                        className="mt-1 block w-full"
                                        inputMode="numeric"
                                        pattern="^371.*"
                                        onInvalid={(e)=> e.currentTarget.setCustomValidity('Le numéro de compte doit commencer par 371')}
                                        onInput={(e)=> e.currentTarget.setCustomValidity('')}
                                        onChange={(e)=>{
                                            const value = e.target.value;
                                            if (value && !value.startsWith('371')) {
                                                e.target.setCustomValidity('Le numéro de compte doit commencer par 371');
                                            } else {
                                                e.target.setCustomValidity('');
                                            }
                                            setData(prev => ({...prev, numero_compte: value}))
                                        }}
                                    />
                                    <InputError message={errors.numero_compte} className="mt-2" />
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="montant" value="Montant" />
                                    <TextInput id="montant" type="text" name="montant" value={data.montant} className="mt-1 block w-full" onChange={(e) => setData('montant', e.target.value)} />
                                    <InputError message={errors.montant} className="mt-2" />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <div className='flex-1'>
                                    <InputLabel htmlFor="address" value="Adresse" />
                                    <TextInput id="address" type="text" name="address" value={data.address} className="mt-1 block w-full" onChange={(e) => setData('address', e.target.value)} />
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="city" value="Ville" />
                                    <TextInput id="city" type="text" name="city" value={data.city} className="mt-1 block w-full" onChange={(e) => setData('city', e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <div className='flex-1'>
                                    <InputLabel htmlFor="bp" value="BP" />
                                    <TextInput id="bp" type="text" name="bp" value={data.bp} className="mt-1 block w-full" onChange={(e) => setData('bp', e.target.value)} />
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="profession" value="profession" />
                                    <TextInput id="profession" type="text" name="profession" value={data.profession} className="mt-1 block w-full" onChange={(e) => setData('profession', e.target.value)} />
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="employeur" value="Employeur" />
                                    <TextInput id="employeur" type="text" name="employeur" value={data.employeur} className="mt-1 block w-full" onChange={(e) => setData('employeur', e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <div className='flex-1'>
                                    <InputLabel htmlFor="piece_identite" value="Pièce d'identité" />
                                    <select id="piece_identite" value={data.piece_identite} onChange={(e)=> setData('piece_identite', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md">
                                        <option value="">Sélectionnez</option>
                                        <option value="cni">Carte nationale d'identité</option>
                                        <option value="passport">Passeport</option>
                                        <option value="permis de conduire">Permis de conduire</option>
                                        <option value="cart_sej">Carte de séjour</option>
                                    </select>
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="numero_piece_identite" value="Numéro de la pièce" />
                                    <TextInput id="numero_piece_identite" type="text" name="numero_piece_identite" value={data.numero_piece_identite} className="mt-1 block w-full" onChange={(e) => setData('numero_piece_identite', e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <div className='flex-1'>
                                    <InputLabel htmlFor="date_de_delivrance_piece_identite" value="Date de délivrance de la pièce" />
                                    <TextInput id="date_de_delivrance_piece_identite" type="date" name="date_de_delivrance_piece_identite" value={data.date_de_delivrance_piece_identite} className="mt-1 block w-full" onChange={(e) => setData('date_de_delivrance_piece_identite', e.target.value)} />
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="date_naissance" value="Date de naissance" />
                                    <TextInput id="date_naissance" type="date" name="date_naissance" value={data.date_naissance} className="mt-1 block w-full" onChange={(e) => setData('date_naissance', e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-1">
                                <div className='flex-1'>
                                    <InputLabel htmlFor="lieu_naissance" value="Lieu de naissance" />
                                    <TextInput id="lieu_naissance" type="text" name="lieu_naissance" value={data.lieu_naissance} className="mt-1 block w-full" onChange={(e) => setData('lieu_naissance', e.target.value)} />
                                </div>
                                <div className='flex-1'>
                                    <InputLabel htmlFor="nationalite" value="Nationalité" />
                                    <TextInput id="nationalite" type="text" name="nationalite" value={data.nationalite} className="mt-1 block w-full" onChange={(e) => setData('nationalite', e.target.value)} />
                                </div>
                            </div>
                            <div className="flex-1">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="montant">
                                        Mode de paiement (*)
                                    </label>
                                    <select
                                        className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.montant ? 'border-red-500' : ''}`}
                                        value={data.mode_paiement}
                                        onChange={(e)=>setData(prev =>({...prev,mode_paiement:e.target.value}))}
                                    >
                                        <option value="">Sélectionnez</option>
                                        <option value="caisse">Caisse</option>
                                        <option value="mobile">Mobile monaie</option>
                                        <option value="carte">Carte prépayée</option>
                                    </select>
							    </div>
                                {data.mode_paiement == "mobile" && <div className="mb-4">
								<label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telephone">
								   Numéro de téléphone (*)
								</label>
								<input
									className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
									id="telephone"
									type="tel"
									placeholder="Votre numéro de téléphone"
									onChange={(e)=>{setData(prev => ({...prev, phone:e.target.value}))}}
									value={data.phone}
								/>
							</div>}
							{data.mode_paiement == "carte" && <div className="mb-4">
								<label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="carte">
									Numéro de la carte (*)
								</label>
								<input
									className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
									id="carte"
									type="text"
									placeholder="Numéro de la carte"
									onChange={(e)=>{setData(prev => ({...prev, carte:e.target.value}))}}
									value={data.carte}
								/>
							</div>}
                            <div className="mt-1">
                                <InputLabel htmlFor="fichiers" value="Joindre des fichiers (*)" />
                                <input id="fichiers" type="file" name="fichiers" multiple className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm" onChange={e => setData('fichiers', e.target.files)} />
                                <InputError message={errors.fichiers} className="mt-2" />
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold">Récapitulatif</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div><strong>Nom:</strong> {data.nom}</div>
                                <div><strong>Prénom:</strong> {data.prenom}</div>
                                <div><strong>Email:</strong> {data.email}</div>
                                <div><strong>Téléphone:</strong> {data.phone}</div>
                                <div><strong>Numéro de compte:</strong> {data.numero_compte}</div>
                                <div><strong>Montant:</strong> {data.montant}</div>
                                <div><strong>Adresse:</strong> {data.address}</div>
                                <div><strong>Ville:</strong> {data.city}</div>
                                <div><strong>BP:</strong> {data.bp}</div>
                                <div><strong>Employeur:</strong> {data.employeur}</div>
                                <div><strong>Pièce:</strong> {data.piece_identite}</div>
                                <div><strong>N° Pièce:</strong> {data.numero_piece_identite}</div>
                                <div><strong>Date délivrance:</strong> {data.date_de_delivrance_piece_identite}</div>
                                <div><strong>Date naissance:</strong> {data.date_naissance}</div>
                                <div><strong>Lieu naissance:</strong> {data.lieu_naissance}</div>
                                <div><strong>Nationalité:</strong> {data.nationalite}</div>
                                <div><strong>Profession:</strong> {data.profession}</div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Contrat</h2>
                            <div className="bg-gray-50 rounded border border-gray-200 p-2">
                                <div className="relative w-full" style={{ minHeight: '40vh' }}>
                                    {!useIframePreview && (
                                        <div ref={docxContainerRef} className="docx-container w-full h-full overflow-auto" style={{ maxHeight: '70vh' }} />
                                    )}
                                    {useIframePreview && (officeViewUrl || googleViewUrl) && (
                                        <div className="w-full" style={{ height: '70vh' }}>
                                            <iframe title="Aperçu du contrat" src={officeViewUrl || googleViewUrl} style={{ width: '100%', height: '100%', border: 0 }} allow="fullscreen" />
                                        </div>
                                    )}
                                    {(!docxUrl && !docxRelativeUrl && !officeViewUrl && !googleViewUrl) && (
                                        <div className="text-gray-600 space-y-2">
                                            <div>Génération de l'aperçu du contrat en cours ou indisponible.</div>
                                            {previewError && (
                                                <div className="text-red-600">{previewError}</div>
                                            )}
                                            <div className="text-xs text-gray-500">
                                                Astuces:
                                                <ul className="list-disc ml-5">
                                                    <li>Vérifiez que vous êtes connecté.</li>
                                                    <li>Ajoutez un modèle DOCX dans <code>resources/contracts/Contrat.docx</code> ou <code>resources/contracts/contrat.docx</code>.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Acceptation</h2>
                            <div className="mb-2">
                                <label className="block text-sm mb-1">Mention manuscrite (taper la mention)</label>
                                <textarea value={acceptanceText} onChange={(e)=> setAcceptanceText(e.target.value)} className="w-full border rounded-md p-2" rows={3} placeholder="Lu et approuvé..." />
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="acceptTerms" type="checkbox" checked={acceptTerms} onChange={(e)=> setAcceptTerms(e.target.checked)} />
                                <label htmlFor="acceptTerms">J'ai lu et j'accepte les termes du contrat</label>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                        <button type="button" className={`px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={goPrev} disabled={currentStep === 1}>
                            Étape précédente
                        </button>
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Traitement...' : currentStep === 4 ? 'Soumettre la demande' : 'Continuer'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
            <FooterHome/>

        </div>
    )
}

export default AvSalaire
