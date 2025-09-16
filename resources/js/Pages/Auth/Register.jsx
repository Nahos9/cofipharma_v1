import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role:''
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const roles = [
        {
            id: 1,
            name: 'admin'
        },
        {
            id: 2,
            name: 'charge client'
        },
        {
            id: 3,
            name: 'responsable_ritel'
        },
        {
            id: 4,
            name: 'operation'
        },
        {
            id: 5,
            name: 'chef_agence'
        },
        {
            id: 6,
            name: 'visiteur'
        }

    ]

    const translateError = (message) => {
        if (!message || typeof message !== 'string') return message;
        const dictionary = {
            'The name field is required.': 'Le champ nom est obligatoire.',
            'The email field is required.': "Le champ e-mail est obligatoire.",
            'The email field must be a valid email address.': "L’e-mail doit être une adresse valide.",
            'The password field is required.': 'Le champ mot de passe est obligatoire.',
            'The password confirmation does not match.': 'La confirmation du mot de passe ne correspond pas.',
            'The password field confirmation does not match.': 'La confirmation du mot de passe ne correspond pas.',
            'The role field is required.': 'Le rôle est obligatoire.'
        };
        if (dictionary[message]) return dictionary[message];
        // Fallbacks simples
        return message
            .replace(/^The\s+/i, '')
            .replace(/\s+field is required\.$/i, ' est obligatoire.')
            .replace(/must be a valid email address\.$/i, 'doit être une adresse e-mail valide.');
    };
    return (
        <GuestLayout>
            <Head title="Inscription" />

            <form onSubmit={submit}>
                {Object.keys(errors).length > 0 && (
                    <div className="mb-4">
                        <ul className="list-disc list-inside text-sm text-red-600">
                            {Object.values(errors).map((error, idx) => (
                                <li key={idx}>{translateError(error)}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div>
                    <InputLabel htmlFor="name" value="Nom" />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />

                    <InputError message={translateError(errors.name)} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="email" value="E-mail" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={translateError(errors.email)} className="mt-2" />
                </div>
                <div className="mt-4">
                    <InputLabel htmlFor="role" value="Rôle" />
                    <select
                        name="role"
                        id="role"
                        className="mt-1 block w-full"
                        value={data.role}
                        onChange={(e) => setData('role', e.target.value)}
                        required
                    >
                        <option value="" disabled>
                            Choisissez un rôle
                        </option>
                        {roles.map((role) => (
                            <option key={role.id} value={role.name}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={translateError(errors.role)} className="mt-2" />
                </div>
                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Mot de passe" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={translateError(errors.password)} className="mt-2" />
                </div>
                <div className="mt-4">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirmez le mot de passe"
                    />

                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        required
                    />

                    <InputError
                        message={translateError(errors.password_confirmation)}
                        className="mt-2"
                    />
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <Link
                        href={route('login')}
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Déjà inscrit ?
                    </Link>

                    <PrimaryButton className="ms-4" disabled={processing}>
                        S’inscrire
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
