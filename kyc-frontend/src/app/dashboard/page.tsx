'use client';

import { useState,useEffect } from 'react';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { getRole,logout } from "@/src/lib/auth";

type Application={
    id:number;
    pan:string;
    name:string;
    status:'DRAFT'|'SUBMITTED'|'VERIFIED'|'APPROVED'|'REJECTED';
    rejectionReason:string|null;
    createdAt:string;
    updatedAt:string;
};

const statusInfo: Record<
Application['status'],
{title:string,text:string,badge:string}
>={
    DRAFT:{
        title:'Continue your KYC',
        text:'Your application is not yet submitted finish it and send it to the verification',
        badge:'bg-yellow-100 text-yellow-800',
    },
    VERIFIED:{
        title:'Under Verification',
        text:'Your KYC has been submitted and waiting for review',
        badge:'bg-blue-100 text-blue-800',
    },
    SUBMITTED:{
        title:'under Verification',
        text:'Your updated kyc has been submitted and waiting for review',
        badge:'bg-blue-100 text-blue-800',
    },
    APPROVED:{
        title:'Kyc Approved',
        text:'Your kyc has been approved nothing more to do',
        badge:'bg-green-100 text-green-800',
    },
    REJECTED:{
        title:'Kyc rejected',
        text:'Your kyc has been rejected',
        badge:'bg-red-100 text-red-800',
    }
};

export default function DashboardPage(){
    const router=useRouter();
    const [application,setApplication]=useState<Application | null>(null);
    const [loading,setLoading]=useState(true);
    const [error,setError]=useState('');

    useEffect(()=>{
        const role=getRole();
        if(!role){
            router.replace('/login');
            return;
        }
        if(role==='ADMIN'){
            router.replace('/admin');
            return;
        }

        api<Application[]>('/applications')
        .then((list)=>{
            const latest=[...list].sort(
                (a,b)=>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )[0];
            setApplication(latest??null);
        })
        .catch((err)=>{
            if(err instanceof Error && err.message==='Unauthorized'){
                logout();
                router.replace('/login');
                return;
            }
            setError(err instanceof Error? err.message:'Something went wrong')
        })
        .finally(()=>setLoading(false));
    },[router]);

    function handleLogout(){
        logout();
        router.push('/login');
    }
    const info= application?statusInfo[application.status]:null;
    const canEdit=application?.status==='DRAFT'||application?.status==='REJECTED';

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="mx-auto max-w-xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">My KYC</h1>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Logout
                    </button>
                </div>

                {loading && <p className="text-gray-600">Loading...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!loading && !error && !application && (
                    <div className="space-y-4 rounded-xl bg-white p-6 shadow">
                        <h2 className="text-lg font-semibold text-gray-900">
                            You have not started your KYC yet
                        </h2>
                        <p className="text-gray-600">
                            Enter your PAN to begin. It takes a few minutes.
                        </p>
                        <Link
                            href="/kyc/new"
                            className="inline-block rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
                        >
                            Start KYC
                        </Link>
                    </div>
                )}
                {application && info && (
                    <div className="space-y-4 rounded-xl bg-white p-6 shadow">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {info.title}
                            </h2>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${info.badge}`}
                            >
                                {application.status}
                            </span>
                        </div>
                        <p className="text-gray-600">{info.text}</p>
                        <div className="text-sm text-gray-500">
                            <p>Name: {application.name}</p>
                            <p>PAN: {application.pan}</p>
                        </div>
                        {application.status === 'REJECTED' &&
                            application.rejectionReason && (
                                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                    Reason: {application.rejectionReason}
                                </div>
                            )}
                        {canEdit && (
                            <Link
                                href={`/kyc/${application.id}`}
                                className="inline-block rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
                            >
                                {application.status === 'DRAFT'
                                    ? 'Continue KYC'
                                    : 'Edit and resubmit'}
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
