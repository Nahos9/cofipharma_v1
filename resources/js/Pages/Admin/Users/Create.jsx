import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Checkbox } from "@/Components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";

export default function Create({ auth }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        role: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.users.store'));
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


    const errorMessages = {
        name: 'Le nom est obligatoire.',
        email: "L'adresse e-mail est invalide ou manquante.",
        password: 'Le mot de passe est obligatoire (au moins 8 caractères).',
        role: 'Veuillez choisir un rôle.'
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Créer un Utilisateur</h2>}
        >
            <Head title="Créer un Utilisateur" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Nouvel Utilisateur</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nom</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                    />
                                    {errors.name && <p className="text-red-500 text-sm">{errorMessages.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                    />
                                    {errors.email && <p className="text-red-500 text-sm">{errorMessages.email}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Mot de passe</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                    />
                                    {errors.password && <p className="text-red-500 text-sm">{errorMessages.password}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Rôles</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select onChange={e => setData('role', e.target.value)}>
                                         <option value="" >Choisissez un rôle</option>
                                        {roles.map((role) => (
                                           <option key={role.id} value={role.name}>
                                                {role.name}
                                           </option>
                                        ))}
                                        </select>
                                    </div>
                                    {errors.role && <p className="text-red-500 text-sm">{errorMessages.role}</p>}
                                </div>

                                <div className="flex justify-end space-x-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => window.history.back()}
                                    >
                                        Annuler
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Créer
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
