import Image from "next/image";
import KakaoSignOut from "@/components/sign-out";

export default function UserProfile({ user }: { user: any }) {
    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md flex flex-col items-center">
            <div className="relative w-20 h-20 mb-4">
                <Image
                    src={user.image || "/default-avatar.png"}
                    alt="Profile"
                    fill
                    className="rounded-full object-cover"
                />
            </div>
            <h2 className="text-xl font-bold">{user.name}님 환영합니다!</h2>
            <p className="text-gray-500 mb-6">{user.email}</p>
            <KakaoSignOut />
        </div>
    );
}