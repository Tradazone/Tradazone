// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

const steps = [
    { title: 'Welcome to Tradazone', description: 'The easiest way to accept crypto payments for your business on Starknet or Stellar.', image: '🚀' },
    { title: 'Create Invoices', description: 'Generate professional invoices and send them to your customers with just a few clicks.', image: '📄' },
    { title: 'Accept Payments', description: 'Accept payments in STRK or XLM. Get paid instantly to your wallet.', image: '💳' },
    { title: 'Manage Your Business', description: 'Track customers, manage transactions, and grow your business with powerful tools.', image: '📊' }
];

function Onboarding() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
        else navigate('/signin');
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    return (
        <div className="min-h-screen bg-page flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-10 text-center">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">≡</span>
                        <span className="text-xl font-bold tracking-tight">tradazone</span>
                    </div>
                    <button className="text-sm text-t-muted hover:text-brand transition-colors" onClick={() => navigate('/signin')}>
                        Skip
                    </button>
                </div>

                <div className="py-10">
                    <div className="text-6xl mb-6">{steps[currentStep].image}</div>
                    <h1 className="text-2xl font-bold text-t-primary mb-3">{steps[currentStep].title}</h1>
                    <p className="text-t-muted max-w-sm mx-auto">{steps[currentStep].description}</p>
                </div>

                <div className="flex flex-col items-center gap-6">
                    <div className="flex gap-2">
                        {steps.map((_, index) => (
                            <span
                                key={index}
                                className={`w-2.5 h-2.5 rounded-full transition-colors ${index === currentStep ? 'bg-brand' : index < currentStep ? 'bg-brand/40' : 'bg-border'
                                    }`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 text-sm font-semibold bg-white text-t-primary border border-border hover:bg-gray-50 active:scale-95 transition-all" onClick={handlePrev}>
                                <ArrowLeft size={18} /> Back
                            </button>
                        )}
                        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 text-sm font-semibold bg-brand text-white hover:bg-brand-dark active:scale-95 transition-all" onClick={handleNext}>
                            {currentStep === steps.length - 1 ? (<>Get Started <Check size={18} /></>) : (<>Next <ArrowRight size={18} /></>)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Onboarding;
