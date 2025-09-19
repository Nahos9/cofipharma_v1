import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from "@/Components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import { Badge } from "@/Components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { Label } from "@/Components/ui/label";
import { Input } from "@/Components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";

export default function Index({ auth, users }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [form, setForm] = React.useState({
        id: null,
        name: "",
        email: "",
        password: "",
        role: "",
    });
    const [errors, setErrors] = React.useState({});

    const openEditModal = async (userId) => {
        try {
            setErrors({});
            setIsSubmitting(false);
            // Charger l'utilisateur et la liste des rôles
            const response = await window.axios.get(route('admin.users.edit', userId));
            const { user} = response.data;
            // setAvailableRoles(roles || []);
            setForm({
                id: user.id,
                name: user.name || "",
                email: user.email || "",
                password: "",
                role: user.role || "",
                // roles: user?.roles?.[0]?.id?.toString?.() || "",
            });
            setIsOpen(true);
        } catch (e) {
            console.error(e);
            alert("Impossible de charger les données de l'utilisateur.");
        }
    };

    const closeModal = () => {
        setIsOpen(false);
        setForm({ id: null, name: "", email: "", password: "", role: "" });
        setErrors({});
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


    const handleChange = (field) => (e) => {
        const value = e?.target ? e.target.value : e;
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.id) return;
        try {
            setIsSubmitting(true);
            setErrors({});
            const selectedRoleId = roles.find((r) => r.name === form.role)?.id?.toString();
            const payload = {
                name: form.name,
                email: form.email,
                role: form.role,
                // champ attendu par le backend pour la relation pivot
                ...(selectedRoleId ? { roles: selectedRoleId } : {}),
            };
            if (form.password && form.password.trim().length > 0) {
                payload.password = form.password;
            }
            await window.axios.put(route('admin.users.update', form.id), payload);
            // Rafraîchir la liste des utilisateurs
            router.reload({ only: ['users'] });
            closeModal();
        } catch (err) {
            if (err?.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            } else {
                console.error(err);
                alert("Erreur lors de la mise à jour de l'utilisateur.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleDelete = (userId) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            router.delete(route('admin.users.destroy', userId), {
                onSuccess: () => {
                    // La page sera automatiquement rechargée par Inertia
                },
            });
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Gestion des Utilisateurs</h2>}
        >
            <Head title="Gestion des Utilisateurs" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-medium">Liste des Utilisateurs</h3>
                                <Link href={route('admin.users.create')}>
                                    <Button>Nouvel Utilisateur</Button>
                                </Link>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Rôle</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                <Badge  variant="secondary">
                                                            {user.role}
                                                        </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditModal(user.id)}
                                                    >
                                                        Modifier
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        Supprimer
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : closeModal())}>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Modifier l'utilisateur</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Nom</Label>
                                            <Input id="name" value={form.name} onChange={handleChange('name')} />
                                            {errors?.name && (
                                                <p className="text-sm text-red-600">{errors.name}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" type="email" value={form.email} onChange={handleChange('email')} />
                                            {errors?.email && (
                                                <p className="text-sm text-red-600">{errors.email}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Mot de passe (optionnel)</Label>
                                            <Input id="password" type="password" value={form.password} onChange={handleChange('password')} placeholder="Laisser vide pour ne pas changer" />
                                            {errors?.password && (
                                                <p className="text-sm text-red-600">{errors.password}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Rôle</Label>
                                            <Select value={form.role} onChange={handleChange('role')}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un rôle" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem key={role.id} value={role.name}>
                                                            {role.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {(errors?.role || errors?.roles) && (
                                                <p className="text-sm text-red-600">{errors.role || errors.roles}</p>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>
                                                Annuler
                                            </Button>
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
