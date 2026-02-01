import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-surface border-2 ${isDanger ? 'border-red-500' : 'border-border'} rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className={`w-12 h-12 ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'} rounded-xl flex items-center justify-center mb-4`}>
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className={`text-2xl font-bold ${isDanger ? 'text-red-500' : 'text-foreground'} uppercase tracking-tight`}>
                        {title}
                    </h3>
                    <p className="text-muted mt-2 font-medium">
                        {message}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-background border-2 border-border text-foreground font-bold rounded-xl hover:bg-border transition-colors uppercase tracking-wider"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-3 font-bold rounded-xl transition-colors uppercase tracking-wider shadow-soft active:scale-95 ${isDanger
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-primary text-primary-fg hover:brightness-110'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
