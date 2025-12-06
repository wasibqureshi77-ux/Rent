import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-amber-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full bg-blue-400/20 blur-3xl" />
                <div className="absolute top-[60%] -left-[20%] w-[60%] h-[60%] rounded-full bg-pink-400/20 blur-3xl" />
            </div>
            <div className="relative z-10 w-full flex justify-center px-4">
                <RegisterForm />
            </div>
        </div>
    );
}
