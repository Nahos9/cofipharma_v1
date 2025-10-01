import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import ClientLayout from '@/Layouts/ClientLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import { Button } from '@/Components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Search, Eye, Filter } from 'lucide-react'

const AllAvSalaire = ({ avSalaires, filters }) => {
    const [search, setSearch] = useState(filters?.search || '')
    const [status, setStatus] = useState(filters?.status || '')

    const handleSearch = (value) => {
        setSearch(value)
        router.get(route('client.av_salaire.all'), {
            ...filters,
            search: value,
            page: 1
        }, { preserveState: true })
    }

    const handleStatusFilter = (value) => {
        setStatus(value)
        router.get(route('client.av_salaire.all'), {
            ...filters,
            status: value,
            page: 1
        }, { preserveState: true })
    }

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const formatMontant = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(montant)

    return (
        <ClientLayout>
            <Head title="Mes avances sur salaire" />
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Mes avances sur salaire</h1>
                        <p className="text-gray-600 mt-1">Consultez vos demandes</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filtres et recherche
                        </CardTitle>
                        <div className="justify-end">
                            <Button className="bg-indigo-600 text-white" onClick={()=> router.get(route('av_salaire'))}>Faire une demande</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input placeholder="Rechercher..." value={search} onChange={(e)=> handleSearch(e.target.value)} className="pl-10" />
                            </div>
                            <select value={status} onChange={(e)=> handleStatusFilter(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="">Tous les statuts</option>
                                <option value="en attente">En attente</option>
                                <option value="accepte">Acceptée</option>
                                <option value="rejete">Rejetée</option>
                                <option value="debloque">Débloquée</option>
                            </select>
                            <Button variant="outline" onClick={()=> { setSearch(''); setStatus(''); router.get(route('client.av_salaire.all')) }}>Réinitialiser</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Avances sur salaire ({avSalaires?.total || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom et prénom</TableHead>
                                        <TableHead>Montant</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!avSalaires?.data || avSalaires.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">Aucune avance trouvée</TableCell>
                                        </TableRow>
                                    ) : (
                                        avSalaires.data.map((a) => (
                                            <TableRow key={a.id} className="hover:bg-gray-50">
                                                <TableCell>{a.nom} {a.prenom}</TableCell>
                                                <TableCell className="font-semibold text-green-600">{formatMontant(a.montant)}</TableCell>
                                                <TableCell>{a.status}</TableCell>
                                                <TableCell>{formatDate(a.created_at)}</TableCell>
                                                <TableCell>
                                                    <Link href={route('client.av_salaire.edit', a.id)} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                                        <Eye className="w-4 h-4" /> Détails
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ClientLayout>
    )
}

export default AllAvSalaire


