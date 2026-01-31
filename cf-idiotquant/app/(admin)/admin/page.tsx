"use client";

import Image from "next/image";
import KakaoSignOut from "@/components/sign-out";
import { useSession } from "next-auth/react";

export default function AdminPage() {
    const { data: session, status } = useSession();

    // 1. 로딩 중일 때 표시할 UI
    if (status === "loading") {
        return <div className="p-10 text-center">권한 확인 중...</div>;
    }

    // 2. 세션이 없거나 관리자가 아닐 때 (미들웨어가 막아주지만 이중 보안)
    if (!session || (session.user as any).role !== "admin") {
        return <div className="p-10 text-center !text-red-500">접근 권한이 없습니다.</div>;
    }

    const user = session.user as any;

    return (
        <div className="max-w-2xl mx-auto p-6">
            {/* 관리자 헤더 */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
                    <span className="text-red-500 text-2xl">🛡️</span> Admin Dashboard
                </h1>
                <p className="text-gray-500 mt-2">서비스의 모든 데이터를 관리할 수 있는 공간입니다.</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-red-50 border-t-4 border-t-red-500 overflow-hidden">
                {/* 관리자 프로필 섹션 */}
                <div className="p-8 flex items-center gap-6 bg-gray-50">
                    <div className="relative w-20 h-20">
                        <Image
                            src={user.image || "/default-avatar.png"}
                            alt="Admin Profile"
                            fill
                            className="rounded-full object-cover ring-4 ring-white shadow-sm"
                        />
                    </div>
                    <div>
                        <div className={`flex items-center gap-2`}>
                            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
                            <span className="px-1 py-0.5 bg-red-100 !text-red-600 text-xs font-bold rounded-full uppercase">
                                Super Admin
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm">{user.email}</p>
                    </div>
                </div>

                {/* 통계 섹션 (유저 페이지에는 없는 관리자용) */}
                <div className="p-8 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">현황 요약</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">전체 사용자</p>
                            <p className="text-xl font-bold text-gray-900">128명</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">오늘 방문자</p>
                            <p className="text-xl font-bold text-gray-900">45명</p>
                        </div>
                    </div>
                </div>

                {/* 푸터 버튼 */}
                <div className="p-6 bg-gray-50 flex justify-between items-center">
                    <p className="text-xs text-gray-400">보안을 위해 작업 후에는 반드시 로그아웃하세요.</p>
                    <div className="min-w-24 flex justify-end">
                        <KakaoSignOut />
                    </div>
                </div>
            </div>
        </div>
    );
}