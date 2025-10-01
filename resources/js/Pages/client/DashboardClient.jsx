import React from 'react'
import ClientLayout from '@/Layouts/ClientLayout'
import { Head } from '@inertiajs/react'

function DashboardClient() {
  return (
    <ClientLayout>
        <Head title="Tableau de bord" />
        <div className="">Bienvenue dans votre espace</div>
    </ClientLayout>
  )
}

export default DashboardClient
