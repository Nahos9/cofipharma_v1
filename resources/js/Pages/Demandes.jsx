import NavigationHome from '@/Components/NavigationHome'
import { Head, router, useForm } from '@inertiajs/react'
import React, { useEffect, useRef, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { renderAsync } from 'docx-preview'
import FooterHome from '@/Components/FooterHome'

const Demande = () => {
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [currentStep, setCurrentStep] = useState(1);
	const [signatureDataUrl, setSignatureDataUrl] = useState(null);
	const [officeViewUrl, setOfficeViewUrl] = useState('');
	const [googleViewUrl, setGoogleViewUrl] = useState('');
	const [docxUrl, setDocxUrl] = useState('');
	const [docxRelativeUrl, setDocxRelativeUrl] = useState('');
	const [useIframePreview, setUseIframePreview] = useState(false);
	const docxContainerRef = useRef(null);
	const canvasRef = useRef(null);
	const isDrawingRef = useRef(false);
	const lastPointRef = useRef({ x: 0, y: 0 });

	const {data,setData,post,processing,errors} = useForm({
		first_name:"",
		last_name:"",
		email:"",
		montant:"",
		numero_compte:"",
		phone:"",
		carte:"",
		mode_paiement:"",
        // Champs alignés au modèle Demande
        civility:"",
        address:"",
        city:"",
        bp:"",
        piece_identite:"",
        numero_piece_identite:"",
        date_naissance:"",
        lieu_naissance:"",
        nationalite:"",
        profession:"",
        employeur:"",
        date_de_delivrance_piece_identite:"",
		files: []
	})

	useEffect(() => {
		if (Object.keys(errors).length > 0) {
			toast.error('Veuillez corriger les erreurs dans le formulaire', {
				position: "top-right",
				autoClose: 5000,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
			});
		}
	}, [errors]);

	const handleFileChange = (e) => {
		const files = Array.from(e.target.files);
		setSelectedFiles(files);
		setData(prev => ({...prev, files: files}));
	};

	const fetchContractPreviewDocx = async () => {
		try {
			const publicBase = (window.PUBLIC_BASE || (import.meta?.env?.VITE_PUBLIC_BASE)) || '';
			const params = new URLSearchParams({
				first_name: data.first_name || '',
				last_name: data.last_name || '',
				email: data.email || '',
				numero_compte: data.numero_compte || '',
				montant: String(data.montant || ''),
				phone: data.phone || '',
				mode_paiement: data.mode_paiement || '',
                date_de_delivrance_piece_identite: data.date_de_delivrance_piece_identite || '',
                date_naissance: data.date_naissance || '',
                lieu_naissance: data.lieu_naissance || '',
                nationalite: data.nationalite || '',
                profession: data.profession || '',
                employeur: data.employeur || '',
                civility: data.civility || '',
                address: data.address || '',
                city: data.city || '',
                bp: data.bp || '',
                piece_identite: data.piece_identite || '',
                numero_piece_identite: data.numero_piece_identite || '',
			});
			if (publicBase) params.set('public_base', publicBase);
			const url = `${route('contracts.previewDocx')}?${params.toString()}`;
			const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
			if (!res.ok) throw new Error('Prévisualisation DOCX indisponible');
			const json = await res.json();
			setOfficeViewUrl(json.office_view_url || '');
			setGoogleViewUrl(json.google_view_url || '');
			setDocxRelativeUrl(json.docx_relative_url || '');
			setDocxUrl(json.docx_url || '');
		} catch (e) {
			toast.error('Impossible de charger le prévisualiseur du contrat');
		}
	};

	const goNext = async (e) => {
		e?.preventDefault();
		// Validation légère pour passer à l'étape suivante
		if (currentStep === 1) {
			if (!data.first_name || !data.email || !data.numero_compte || !data.montant) {
				toast.warn('Veuillez remplir les champs requis de l\'étape 1.');
				return;
			}
		}
		const next = Math.min(4, currentStep + 1);
		setCurrentStep(next);
		if (next === 4) {
			await fetchContractPreviewDocx();
		}
	};

	const goPrev = (e) => {
		e?.preventDefault();
		setCurrentStep(s => Math.max(1, s - 1));
	};

	const initCanvas = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		const ctx = canvas.getContext('2d');
		ctx.scale(dpr, dpr);
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		ctx.strokeStyle = '#111827';
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, rect.width, rect.height);
	};

	useEffect(() => {
		initCanvas();
		window.addEventListener('resize', initCanvas);
		return () => window.removeEventListener('resize', initCanvas);
	}, []);

	const getPos = (canvas, e) => {
		const rect = canvas.getBoundingClientRect();
		const clientX = e.touches ? e.touches[0].clientX : e.clientX;
		const clientY = e.touches ? e.touches[0].clientY : e.clientY;
		return { x: clientX - rect.left, y: clientY - rect.top };
	};

	const handleStartDraw = (e) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		isDrawingRef.current = true;
		lastPointRef.current = getPos(canvas, e);
	};

	const handleMoveDraw = (e) => {
		const canvas = canvasRef.current;
		if (!canvas || !isDrawingRef.current) return;
		const ctx = canvas.getContext('2d');
		const { x, y } = getPos(canvas, e);
		ctx.beginPath();
		ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
		ctx.lineTo(x, y);
		ctx.stroke();
		lastPointRef.current = { x, y };
		e.preventDefault();
	};

	const handleEndDraw = () => {
		isDrawingRef.current = false;
	};

	const clearSignature = () => {
		initCanvas();
		setSignatureDataUrl(null);
	};

	const saveSignature = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		// Export en PNG
		const dataUrl = canvas.toDataURL('image/png');
		// Vérifier que l'utilisateur a bien dessiné (différent du fond blanc)
		if (!dataUrl) {
			toast.warn('Veuillez ajouter une signature.');
			return;
		}
		setSignatureDataUrl(dataUrl);
		toast.success('Signature enregistrée.');
	};

	const handleFinalSubmit = (e) => {
		e.preventDefault();
		const formData = new FormData();
		formData.append('first_name', data.first_name);
		formData.append('last_name', data.last_name);
		formData.append('email', data.email);
		formData.append('numero_compte', data.numero_compte);
		formData.append('montant', data.montant);
		formData.append('phone', data.phone);
		formData.append('mode_paiement', data.mode_paiement);
		formData.append('civility', data.civility);
		formData.append('address', data.address);
		formData.append('city', data.city);
		formData.append('bp', data.bp);
		formData.append('piece_identite', data.piece_identite);
		formData.append('numero_piece_identite', data.numero_piece_identite);
		formData.append('date_naissance', data.date_naissance);
		formData.append('lieu_naissance', data.lieu_naissance);
		formData.append('nationalite', data.nationalite);
		formData.append('profession', data.profession);
		formData.append('employeur', data.employeur);
        formData.append('dure', "1");
        formData.append('date_de_delivrance_piece_identite', data.date_de_delivrance_piece_identite);

		data.files.forEach((file, index) => {
			formData.append(`files[${index}]`, file);
		});

		if (signatureDataUrl) {
			// Convertir DataURL en Blob
			const byteString = atob(signatureDataUrl.split(',')[1]);
			const mimeString = signatureDataUrl.split(',')[0].split(':')[1].split(';')[0];
			const ab = new ArrayBuffer(byteString.length);
			const ia = new Uint8Array(ab);
			for (let i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			const blob = new Blob([ab], { type: mimeString });
			formData.append('signature', blob, 'signature.png');
		}

		post(route('demandes.store'), {
			forceFormData: true,
			onSuccess: () => {
				setData({
					first_name: "",
					last_name: "",
					email: "",
					montant: "",
					phone: "",
					numero_compte: "",
					mode_paiement: "",
					files: []
				});
				setSelectedFiles([]);
				setSignatureDataUrl(null);
				setCurrentStep(1);
				toast.success('🎉 Votre demande a été envoyée avec succès.', { position: 'top-right' });
				setTimeout(() => { router.visit(route('welcome')) }, 1200);
			},
			onError: () => {
				toast.error('Une erreur est survenue lors de l\'envoi de la demande');
			}
		});
	};

	const progressPercent = currentStep === 1 ? 25 : currentStep === 2 ? 50 : currentStep === 3 ? 75 : 100;

	useEffect(() => {
		const renderDocx = async () => {
			if (currentStep !== 4 || (!docxRelativeUrl && !docxUrl) || !docxContainerRef.current) return;
			try {
				const href = docxRelativeUrl || docxUrl;
				const resp = await fetch(href, { credentials: 'same-origin' });
				if (!resp.ok) throw new Error('Docx non accessible');
				const blob = await resp.blob();
				const arrayBuffer = await blob.arrayBuffer();
				docxContainerRef.current.innerHTML = '';
				await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
					className: 'docx-view', inWrapper: true, ignoreWidth: false, ignoreHeight: false
				});
				setUseIframePreview(false);
			} catch (err) {
				// Fallback viewers si besoin
				setUseIframePreview(true);
			}
		};
		renderDocx();
	}, [currentStep, docxUrl, docxRelativeUrl]);

	return (
		<div className="min-h-screen w-100 bg-gray-100">
			<Head title='Demandes' />
			<NavigationHome />
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

			<div className="max-w-6xl mx-auto p-4 sm:p-6 w-100">
				<h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 text-center sm:text-left">Nouvelle Demande Cofi'Pharma</h1>

				{/* Barre de progression */}
				<div className="mb-4">
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progressPercent}%` }} />
					</div>
					<div className="flex justify-between text-xs text-gray-600 mt-2">
						<span>Étape 1: Formulaire</span>
						<span>Étape 2: Récapitulatif</span>
						<span>Étape 3: Signature</span>
						<span>Étape 4: Contrat</span>
					</div>
				</div>

				<form className="bg-white shadow-md rounded-lg px-4 sm:px-8 pt-6 pb-8 mb-4" onSubmit={currentStep === 4 ? handleFinalSubmit : goNext}>
					{currentStep === 1 && (
						<>
                            <div className="mb-4 ">
                                <label htmlFor="civility">Civilité</label>
                                <select name="civility" id="civility" onChange={(e)=>{setData(prev => ({...prev, civility:e.target.value}))}} value={data.civility} className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'>
                                    <option value="">Sélectionnez</option>
                                    <option value="mr">Mr</option>
                                    <option value="mme">Mme</option>
                                </select>
                            </div>
                            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">

								<div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nom">
									Nom (*)
								</label>
								<input
									className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.first_name ? 'border-red-500' : ''}`}
									id="nom"
									type="text"
									placeholder="Votre nom"
									onChange={(e)=>{setData(prev => ({...prev, first_name:e.target.value}))}}
									value={data.first_name}
								/>
								{errors.first_name && (
									<p className="text-red-500 text-xs italic mt-1">{errors.first_name}</p>
								)}
                                </div>
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="prenom">
									Prénom
								</label>
								<input
									className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.last_name ? 'border-red-500' : ''}`}
									id="prenom"
									type="text"
									placeholder="Votre prénom"
									onChange={(e)=>{setData(prev => ({...prev, last_name: e.target.value}))}}
									value={data.last_name}
								/>
								{errors.last_name && (
									<p className="text-red-500 text-xs italic mt-1">{errors.last_name}</p>
								)}
                                </div>
							</div>

                            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nom">
									Date de naissance
								</label>
								<input
									className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.first_name ? 'border-red-500' : ''}`}
                            id="date_naissance"
									type="date"
									placeholder="Votre date de naissance"
                            onChange={(e)=>{setData(prev => ({...prev, date_naissance:e.target.value}))}}
                            value={data.date_naissance}
								/>
                        {errors.date_naissance && (
                            <p className="text-red-500 text-xs italic mt-1">{errors.date_naissance}</p>
								)}
                                </div>
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="prenom">
									Lieu de naissance
								</label>
								<input
                            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.lieu_naissance ? 'border-red-500' : ''}`}
                            id="lieu_naissance"
									type="text"
									placeholder="Votre lieu de naissance"
                            onChange={(e)=>{setData(prev => ({...prev, lieu_naissance: e.target.value}))}}
                            value={data.lieu_naissance}
								/>
                        {errors.lieu_naissance && (
                            <p className="text-red-500 text-xs italic mt-1">{errors.lieu_naissance}</p>
								)}
                                </div>
							</div>
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nom">
									Piece d'identité
								</label>
								<select
                                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.piece_identite ? 'border-red-500' : ''}`}
                                name="piece_identite" id="piece_identite" onChange={(e)=>{setData(prev => ({...prev, piece_identite:e.target.value}))}} value={data.piece_identite}>
                                    <option value="">Sélectionnez</option>
                                    <option value="cni">Carte nationale d'identité</option>
                                    <option value="passport">Passport</option>
                                    <option value="permis de conduire">Permis de conduire</option>
                                    <option value="cart_sej">Carte de séjour</option>
                                </select>
								{errors.piece_identite && (
                                 <p className="text-red-500 text-xs italic mt-1">{errors.piece_identite}</p>
								)}
                                </div>
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="prenom">
									Numéro de la piece d'identité
								</label>
								<input
                                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.numero_piece_identite ? 'border-red-500' : ''}`}
                                    id="numero_piece_identite"
                                            type="text"
                                            placeholder="Votre numéro de la piece d'identité"
                                    onChange={(e)=>{setData(prev => ({...prev, numero_piece_identite: e.target.value}))}}
                                    value={data.numero_piece_identite}
                                        />
                                    {errors.numero_piece_identite && (
                                    <p className="text-red-500 text-xs italic mt-1">{errors.numero_piece_identite}</p>
								)}
                                </div>
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date_de_delivrance_piece_identite">
									Date de delivrance de la piece d'identité
								</label>
								<input
									className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.first_name ? 'border-red-500' : ''}`}
                                    id="date_de_delivrance_piece_identite"
									type="date"
									placeholder="Votre date de delivrance de la piece d'identité"
                            onChange={(e)=>{setData(prev => ({...prev, date_de_delivrance_piece_identite:e.target.value}))}}
                            value={data.date_de_delivrance_piece_identite}
								/>
                        {errors.date_de_delivrance_piece_identite && (
                            <p className="text-red-500 text-xs italic mt-1">{errors.date_de_delivrance_piece_identite}</p>
								)}
                                </div>
							</div>

                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
									Email (*)
								</label>
								<input
									className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.email ? 'border-red-500' : ''}`}
									id="email"
									type="email"
									placeholder="Votre email"
									onChange={(e)=>{setData(prev => ({...prev, email:e.target.value}))}}
									value={data.email}
								/>
								{errors.email && (
									<p className="text-red-500 text-xs italic mt-1">{errors.email}</p>
								)}
                                </div>
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="numero_compte">
									Numéro de compte courant (*)
								</label>
								<input
								   className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.numero_compte ? 'border-red-500' : ''}`}
								   id="numero_compte"
								   type="text"
								   inputMode="numeric"
								   placeholder="Votre numéro de compte"
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
								   value={data.numero_compte}
								   required
								/>
								{errors.numero_compte && (
									<p className="text-red-500 text-xs italic mt-1">{errors.numero_compte}</p>
								)}
                                </div>
							</div>
                            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nationalite">
									Nationalité
								</label>
								<input
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    id="nationalite"
									type="text"
									placeholder="Votre nationalité"
                                    onChange={(e)=>{setData(prev => ({...prev, nationalite:e.target.value}))}}
                                    value={data.nationalite}
								/>
                                </div>
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profession">
									Profession
								</label>
								<input
                                   className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                   id="profession"
								   type="text"
								   placeholder="Votre profession"
                                   onChange={(e)=>{setData(prev => ({...prev, profession: e.target.value}))}}
                                   value={data.profession}
                                />
                                </div>
                                <div className="flex-1">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="employeur">
                                    Employeur
								</label>
								<input
                                   className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                   id="employeur"
								   type="text"
								   placeholder="Votre employeur"
                                   onChange={(e)=>{setData(prev => ({...prev, employeur: e.target.value}))}}
                                   value={data.employeur}
                                />
                                </div>
                            </div>
                            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="flex-1">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                                        Adresse
                                    </label>
                                    <input
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        id="address"
                                        type="text"
                                        placeholder="Votre adresse"
                                        onChange={(e)=>{setData(prev => ({...prev, address:e.target.value}))}}
                                        value={data.address}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
                                        Ville
                                    </label>
                                    <input
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        id="city"
                                        type="text"
                                        placeholder="Votre ville"
                                        onChange={(e)=>{setData(prev => ({...prev, city:e.target.value}))}}
                                        value={data.city}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bp">
                                        BP
                                    </label>
                                    <input
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        id="bp"
                                        type="text"
                                        placeholder="Votre BP"
                                        onChange={(e)=>{setData(prev => ({...prev, bp:e.target.value}))}}
                                        value={data.bp}
                                    />
                                </div>
							</div>
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="flex-1">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telephone">
                                        Téléphone
                                    </label>
                                    <input
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        id="telephone"
                                        type="tel"
                                        placeholder="Votre numéro de téléphone"
                                        onChange={(e)=>{setData(prev => ({...prev, phone:e.target.value}))}}
                                        value={data.phone}
                                    />
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
							</div>


							<div className="mb-4">
								<label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="montant">
									Montant (*)
								</label>
								<input
									className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.montant ? 'border-red-500' : ''}`}
									id="montant"
									type="number"
									step="0.01"
									placeholder="Montant de la demande"
									onChange={(e)=>{setData(prev => ({...prev, montant:e.target.value}))}}
									value={data.montant}
								/>
								{errors.montant && (
									<p className="text-red-500 text-xs italic mt-1">{errors.montant}</p>
								)}
							</div>
							<div className="mb-4">
								<label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="files">
									Documents (PDF, Images) (*)
								</label>
								<input
									className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.files ? 'border-red-500' : ''}`}
									id="files"
									type="file"
									multiple
									accept=".pdf,.jpg,.jpeg,.png"
									onChange={handleFileChange}
								/>
								{errors.files && (
									<p className="text-red-500 text-xs italic mt-1">{errors.files}</p>
								)}
								{selectedFiles.length > 0 && (
									<div className="mt-2">
										<p className="text-sm text-gray-600">Fichiers sélectionnés :</p>
										<ul className="mt-1 text-sm text-gray-500">
											{selectedFiles.map((file, index) => (
												<li key={index} className="flex items-center">
													<span className="mr-2">•</span>
													{file.name} ({(file.size / 1024).toFixed(2)} KB)
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						</>
					)}

					{currentStep === 2 && (
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-800">Récapitulatif</h2>
							<div className="bg-gray-50 rounded border border-gray-200 p-4">
								<p><span className="text-gray-500">Nom:</span> <strong>{data.first_name} {data.last_name}</strong></p>
								<p><span className="text-gray-500">Email:</span> <strong>{data.email}</strong></p>
								<p><span className="text-gray-500">Compte:</span> <strong>{data.numero_compte}</strong></p>
								<p><span className="text-gray-500">Téléphone:</span> <strong>{data.phone || '-'}</strong></p>
								<p><span className="text-gray-500">Mode paiement:</span> <strong>{data.mode_paiement || '-'}</strong></p>
								<p><span className="text-gray-500">Montant:</span> <strong>{data.montant}</strong></p>
								{selectedFiles.length > 0 && (
									<div className="mt-2">
										<p className="text-sm text-gray-600">Documents joints:</p>
										<ul className="mt-1 text-sm text-gray-500 list-disc list-inside">
											{selectedFiles.map((file, index) => (
												<li key={index}>{file.name}</li>
											))}
										</ul>
									</div>
								)}
							</div>
						</div>
					)}

					{currentStep === 3 && (
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-800">Contrat & Signature</h2>
							<div className="bg-gray-50 rounded border border-gray-200 p-4 text-sm text-gray-700 leading-relaxed max-h-56 overflow-auto">
								<p>
									En validant, vous confirmez l'exactitude des informations fournies et acceptez les termes du contrat de financement CofiExpress. Vous autorisez la vérification de vos données et l'utilisation de vos documents pour l'étude de votre dossier.
								</p>
								<p className="mt-2">
									Veuillez signer ci-dessous pour finaliser votre demande.
								</p>
							</div>

							<div>
								<div className="mb-2 text-gray-600 text-sm">Signature du demandeur</div>
								<div className="border rounded-md bg-white">
									<canvas
										ref={canvasRef}
										style={{ width: '100%', height: 180, touchAction: 'none', display: 'block' }}
										onMouseDown={handleStartDraw}
										onMouseMove={handleMoveDraw}
										onMouseUp={handleEndDraw}
										onMouseLeave={handleEndDraw}
										onTouchStart={handleStartDraw}
										onTouchMove={handleMoveDraw}
										onTouchEnd={handleEndDraw}
									/>
								</div>
								<div className="flex gap-2">
									<button type="button" className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300" onClick={clearSignature}>Effacer</button>
									<button type="button" className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onClick={saveSignature}>Enregistrer la signature</button>
								</div>
								{signatureDataUrl && (
									<div className="mt-2">
										<div className="text-xs text-gray-500 mb-1">Aperçu:</div>
										<img src={signatureDataUrl} alt="Signature" className="border rounded max-h-24" />
									</div>
								)}
							</div>
						</div>
					)}

					{currentStep === 4 && (
						<div className="space-y-4">
							<h2 className="text-lg font-semibold text-gray-800">Aperçu du contrat</h2>
							<div className="bg-gray-50 rounded border border-gray-200 p-2">
				<div className="relative w-full" style={{ minHeight: '40vh' }}>
					{!useIframePreview && (
						<div ref={docxContainerRef} className="docx-container w-full h-full overflow-auto" style={{ maxHeight: '70vh' }} />
					)}
					{useIframePreview && (officeViewUrl || googleViewUrl) && (
						<div className="w-full" style={{ height: '70vh' }}>
							<iframe
								title="Aperçu du contrat"
								src={officeViewUrl || googleViewUrl}
								style={{ width: '100%', height: '100%', border: 0 }}
								allow="fullscreen"
							/>
						</div>
					)}
				</div>

							</div>
						</div>
					)}

					<div className="flex items-center justify-between mt-6">
						<button
							type="button"
							className={`px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
							onClick={(e)=>{e.preventDefault(); setCurrentStep(s => Math.max(1, s - 1));}}
							disabled={currentStep === 1}
						>
							Étape précédente
						</button>

						<button
							className={`px-4 py-2 rounded text-white ${currentStep === 4 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-500 hover:bg-blue-700'} ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
							type="submit"
							disabled={processing}
						>
							{processing ? 'Traitement...' : currentStep === 4 ? 'Soumettre la demande' : 'Continuer'}
						</button>
					</div>
				</form>
			</div>
            <FooterHome/>
		</div>
	)
}

export default Demande
