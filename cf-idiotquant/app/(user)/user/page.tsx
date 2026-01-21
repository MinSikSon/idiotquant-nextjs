import { redirect } from "next/navigation";
import Image from "next/image";
import KakaoSignOut from "@/components/sign-out";
import { useSession } from "next-auth/react";

export default function UserPage() {
    // 1. 서버에서 세션 가져오기
    const { data: session, status } = useSession()

    // 2. 로그인하지 않은 경우 보호 로직
    if (!session || !session.user) {
        redirect("/login"); // 로그인 페이지 경로에 맞게 수정하세요
    }

    const { user } = session;

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
            <div className="flex flex-col items-center">
                {/* 프로필 이미지 */}
                <div className="relative w-24 h-24 mb-4">
                    <Image
                        src={user.image || "/default-avatar.png"} // 이미지가 없을 때 기본 이미지
                        alt="프로필 이미지"
                        fill
                        className="rounded-full object-cover border-2 border-yellow-400"
                    />
                </div>

                {/* 유저 정보 */}
                <h1 className="text-2xl font-bold text-gray-800">{user.name}</h1>
                <p className="text-gray-500 mb-6">{user.email}</p>

                <div className="w-full border-t border-gray-100 pt-6 space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">가입 계정</span>
                        <span className="font-medium text-gray-700">카카오톡</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">로그인 상태</span>
                        <span className="text-green-500 font-medium">인증됨</span>
                    </div>
                </div>

                {/* 로그아웃 버튼 */}
                <div className="mt-8 w-full">
                    <KakaoSignOut />
                </div>
            </div>
        </div>
    );
}