import { ArrowRight } from "lucide-react";

interface CheckoutStepsProps {
  currentStep: 1 | 2 | 3;
}

const CheckoutSteps = ({ currentStep }: CheckoutStepsProps) => {
  const steps = [
    { id: 1, label: "Shopping Cart" },
    { id: 2, label: "Payment & Delivery Options" },
    { id: 3, label: "Order Received" },
  ];

  return (
    <div className="mx-auto mb-8 flex max-w-xs flex-col gap-3 px-2 text-sm md:mb-14 md:max-w-none md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-12 md:px-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-start md:gap-6">
          <div className="flex items-center gap-2">
            <span
              className={`h-8 w-8 flex items-center justify-center font-bold text-xs transition-colors ${
                currentStep === step.id ? "bg-orange text-white" : "bg-primary text-white"
              }`}
            >
              {step.id}
            </span>
            <span
              className={`whitespace-nowrap transition-colors ${
                currentStep === step.id ? "font-bold text-primary" : "font-semibold text-primary"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && <ArrowRight className="hidden h-4 w-4 text-[#b8c2d4] md:block" />}
        </div>
      ))}
    </div>
  );
};

export default CheckoutSteps;
