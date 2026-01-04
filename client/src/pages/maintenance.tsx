import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Wrench } from "lucide-react";

interface MaintenancePageProps {
    message?: string;
}

export default function MaintenancePage({ message }: MaintenancePageProps) {
    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Logo/Icon Area */}
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-accent/20 rounded-full animate-pulse" />
                    <div className="relative bg-surface-2 p-6 rounded-full border border-accent/30 shadow-[0_0_30px_rgba(255,102,0,0.2)]">
                        <Wrench className="w-12 h-12 text-accent" />
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 animate-bounce delay-100">
                        <Clock className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="absolute bottom-2 left-0 animate-bounce delay-300">
                        <AlertTriangle className="w-5 h-5 text-gray-500" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        System Maintenance
                    </h1>
                    <div className="bg-surface-2/50 border border-border rounded-lg p-6 backdrop-blur-sm">
                        <p className="text-gray-300 leading-relaxed text-lg">
                            {message || "We're currently performing scheduled maintenance to improve your experience. We'll be back shortly!"}
                        </p>
                    </div>
                    <p className="text-sm text-gray-500">
                        Thank you for your patience.
                    </p>
                </div>

                {/* Footer */}
                <div className="pt-8 border-t border-gray-800">
                    <p className="text-xs text-gray-600 font-mono">
                        AccountzCLub &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}
