import InputError from '@/Components/InputError';
import { useForm,router } from '@inertiajs/react';
import { Eye, EyeOff, LoaderPinwheel, Mail, Lock, User } from 'lucide-react';
import React, { useState } from 'react'

const Inscription = () => {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role:''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('storeClient'));
        reset();
        toast.success('Inscription réussie');
        router.visit(route('login'));

    };
    const roles = [
        {
            id: 1,
            name: 'client'
        }
    ];

    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };
    const translateError = (message) => {
        // Gérer les tableaux d'erreurs (Laravel peut renvoyer un tableau par champ)
        if (Array.isArray(message)) {
            return message.map(translateError)[0];
        }
        if (!message || typeof message !== 'string') return message;

        const exact = {
            'The email field is required.': 'Le champ e-mail est obligatoire.',
            'The email field must be a valid email address.': "L’e-mail doit être une adresse valide.",
            'The password field is required.': 'Le champ mot de passe est obligatoire.',
            'The password field confirmation does not match.': 'La confirmation du mot de passe ne correspond pas.',
            'The password confirmation does not match.': 'La confirmation du mot de passe ne correspond pas.',
            'These credentials do not match our records.': 'Identifiants invalides.',
            'Too many login attempts. Please try again later.': 'Trop de tentatives. Réessayez plus tard.',
            'The name field is required.': 'Le nom est obligatoire.',
            'The role field is required.': 'Le rôle est obligatoire.',
        };
        if (exact[message]) return exact[message];

        // Règles génériques courantes Laravel
        let translated = message;
        // required
        translated = translated.replace(/^The\s+(.*?)\s+field is required\.$/i, (_, f) => `${toFrenchField(f)} est obligatoire.`);
        // email
        translated = translated.replace(/^The\s+(.*?)\s+field must be a valid email address\.$/i, (_, f) => `${toFrenchField(f)} doit être une adresse e-mail valide.`);
        // unique
        translated = translated.replace(/^The\s+(.*?)\s+has already been taken\.$/i, (_, f) => `${toFrenchField(f)} est déjà pris.`);
        // min characters
        translated = translated.replace(/^The\s+(.*?)\s+field must be at least\s+(\d+)\s+characters\.$/i, (_, f, n) => `${toFrenchField(f)} doit contenir au moins ${n} caractères.`);
        // max characters
        translated = translated.replace(/^The\s+(.*?)\s+field must not be greater than\s+(\d+)\s+characters\.$/i, (_, f, n) => `${toFrenchField(f)} ne doit pas dépasser ${n} caractères.`);
        // confirmed
        translated = translated.replace(/^The\s+(.*?)\s+field confirmation does not match\.$/i, (_, f) => `La confirmation de ${toFrenchField(f)} ne correspond pas.`);
        // string
        translated = translated.replace(/^The\s+(.*?)\s+field must be a string\.$/i, (_, f) => `${toFrenchField(f)} doit être une chaîne de caractères.`);
        // numeric
        translated = translated.replace(/^The\s+(.*?)\s+field must be a number\.$/i, (_, f) => `${toFrenchField(f)} doit être un nombre.`);

        return translated;
    };

    const toFrenchField = (field) => {
        const map = {
            email: 'l’e-mail',
            password: 'le mot de passe',
            'password confirmation': 'la confirmation du mot de passe',
            name: 'le nom',
            role: 'le rôle',
        };
        const key = String(field || '').toLowerCase();
        return map[key] || `le champ ${field}`;
    };
  return (
    <div className="h-screen  flex items-center justify-center">
            <div className="flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-red-600 text-white p-8 md:w-1/2 flex flex-col items-center justify-center">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center mb-6">
                            <i className="fas fa-heartbeat text-4xl mr-3 animate-pulse-slow"></i>
                            <h1 className="text-3xl font-bold">Cofi'Express</h1>
                        </div>
                        <p className="text-xl mb-2">La plate-forme idéale</p>
                        <p className="opacity-90"></p>
                    </div>

                    <div className="relative w-full max-w-xs">
                        <img src="/img/cofina.png" alt="Médecin" className="w-full h-auto rounded-lg shadow-lg"/>
                        <div className="absolute -bottom-4 -right-4 bg-white text-alldoc p-3 rounded-full shadow-lg">
                            <i className="fas fa-calendar-check text-2xl"></i>
                        </div>
                    </div>

                    {/* <div className="mt-12 text-center">
                        <p className="text-sm opacity-80">Pas encore inscrit ?</p>
                        <button id="showRegister" className="mt-2 px-6 py-2 text-red-600 bg-white text-alldoc rounded-full font-medium hover:bg-gray-100 transition duration-300">
                            Créer un compte
                        </button>
                    </div> */}
                </div>
                <div className="bg-white p-8 md:w-1/2 flex flex-col justify-center">
                    <form onSubmit={handleSubmit}>
                    <div id="loginForm">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Inscrivez-vous</h2>
                        <p className="text-gray-600 mb-8">Accédez à votre espace personnel</p>

                        {Object.keys(errors).length > 0 && (
                            <div className="mb-4">
                                <ul className="list-disc list-inside text-sm text-red-600">
                                    {Object.values(errors).map((error, idx) => (
                                        <li key={idx}>{translateError(error)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="space-y-4">
                        <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0  left-0 pl-3 flex items-center pointer-events-none">
                                        {/* <i className="fas fa-envelope text-gray-400"></i> */}
                                        <User className='text-gray-400' />
                                    </div>
                                    <input type="string" id="name" className="pl-10 w-full px-1 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300" placeholder="jhon doe"
                                    onChange={(e) => setData('name', e.target.value)}
                                        value={data.name}
                                    />
                                </div>
                                <InputError message={translateError(errors.name)} className="mt-2" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0  left-0 pl-3 flex items-center pointer-events-none">
                                        {/* <i className="fas fa-envelope text-gray-400"></i> */}
                                        <Mail className='text-gray-400' />
                                    </div>
                                    <input type="email" id="email" className="pl-10 w-full px-1 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300" placeholder="votre@email.com"
                                    onChange={(e) => setData('email', e.target.value)}
                                    value={data.email}
                                    />
                                </div>
                                <InputError message={translateError(errors.email)} className="mt-2" />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {/* <i className="fas fa-lock text-gray-400"></i> */}
                                        <Lock className='text-gray-400' />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300"
                                        placeholder="••••••••"
                                        onChange={(e) => setData('password', e.target.value)}
                                        value={data.password}
                                    />
                                    <button
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>
                                <InputError message={translateError(errors.password)} className="mt-2" />
                            </div>
                            <div>
                                <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {/* <i className="fas fa-lock text-gray-400"></i> */}
                                        <Lock className='text-gray-400' />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password_confirmation"
                                        className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300"
                                        placeholder="••••••••"
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        value={data.password_confirmation}
                                    />
                                    <button
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </button>
                                </div>
                                <InputError message={translateError(errors.password_confirmation)} className="mt-2" />
                            </div>


                            {/* <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input id="remember" type="checkbox" className="h-4 w-4 text-alldoc focus:ring-alldoc border-gray-300 rounded"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked)}
                                    />
                                    <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">Se souvenir de moi</label>
                                </div>
                                <a href="#" className="text-sm text-alldoc hover:underline">Mot de passe oublié ?</a>
                            </div> */}

                            <button type="submit" id="loginBtn" className="w-full bg-alldoc bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition duration-300 flex items-center justify-center">
                                <span id="loginText">S'inscrire</span>
                                <span id="loginSpinner" className="hidden ml-2">
                                    {/* <i className="fas fa-spinner fa-spin"></i> */}
                                    <LoaderPinwheel />
                                </span>
                            </button>

                            {/* <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Ou continuez avec</span>
                                </div>
                            </div> */}

                            {/* <div className="grid grid-cols-2 gap-4">
                                <button type="button" className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-300">
                                    <i className="fab fa-google text-red-500 mr-2"></i>
                                    <span>Google</span>
                                </button>
                                <button type="button" className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-300">
                                    <i className="fab fa-facebook-f text-red-600 mr-2"></i>
                                    <span>Facebook</span>
                                </button>
                            </div> */}
                        </div>
                    </div>
                    </form>

                    <div id="registerForm" className="hidden">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Créer un compte</h2>
                        <p className="text-gray-600 mb-8">Rejoignez notre communauté médicale</p>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label for="firstName" className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                                    <input type="text" id="firstName" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300" placeholder="Votre prénom" />
                                </div>
                                <div>
                                    <label for="lastName" className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                    <input type="text" id="lastName" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300" placeholder="Votre nom" />
                                </div>
                            </div>

                            <div>
                                <label for="registerEmail" className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i className="fas fa-envelope text-gray-400"></i>
                                    </div>
                                    <input type="email" id="registerEmail" className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300" placeholder="votre@email.com" />
                                </div>
                            </div>

                            <div>
                                <label for="registerPassword" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i className="fas fa-lock text-gray-400"></i>
                                    </div>
                                    <input type="password" id="registerPassword" className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300" placeholder="••••••••" />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">8 caractères minimum avec au moins 1 chiffre</p>
                            </div>

                            <div>
                                <label for="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i className="fas fa-lock text-gray-400"></i>
                                    </div>
                                    <input type="password" id="confirmPassword" className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-alldoc input-focus transition duration-300" placeholder="••••••••" />
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input id="terms" type="checkbox" className="h-4 w-4 text-alldoc focus:ring-alldoc border-gray-300 rounded" />
                                </div>
                                <label for="terms" className="ml-2 block text-sm text-gray-700">
                                    J'accepte les <a href="#" className="text-alldoc hover:underline">conditions d'utilisation</a> et la <a href="#" className="text-alldoc hover:underline">politique de confidentialité</a>
                                </label>
                            </div>

                            <button type="button" id="registerBtn" className="w-full bg-alldoc text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition duration-300 flex items-center justify-center">
                                <span id="registerText">S'inscrire</span>
                                <span id="registerSpinner" className="hidden ml-2">
                                    <i className="fas fa-spinner fa-spin"></i>
                                </span>
                            </button>

                            <div className="text-center mt-4">
                                <button id="showLogin" className="text-alldoc hover:underline">Déjà un compte ? Se connecter</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
  )
}

export default Inscription
