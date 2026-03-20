import { Check } from "lucide-react";
import { Link } from "react-router-dom";

interface CheckoutStepsProps {
  currentStep: 1 | 2 | 3 | 4;
}

const CheckoutSteps = ({ currentStep }: CheckoutStepsProps) => {
  const steps = [
    { id: 1, label: "Cart", path: "/cart" },
    { id: 2, label: "Deliver / Collect", path: "/checkout" },
    { id: 3, label: "Checkout", path: "/payment" },
    { id: 4, label: "Complete", path: null },
  ];

  return (
    <div className="mx-auto mb-8 max-w-5xl px-2 md:mb-14 md:px-4">
      <ol className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-x-6 md:gap-y-0">
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.id;
          const isDone = currentStep > step.id;
          const canNavigate = Boolean(step.path) && !isCurrent;
          const circleClass = isCurrent || isDone
            ? "border-primary bg-primary text-white"
            : "border-[#c3cad9] bg-transparent text-primary";

          const content = (
            <>
              <span
                className={`grid h-12 w-12 place-items-center rounded-full border text-base font-semibold transition-colors ${circleClass}`}
              >
                {isDone ? <Check className="h-6 w-6" /> : step.id}
              </span>
              <span
                className={`mt-3 block text-[13px] leading-tight md:text-sm ${
                  isCurrent ? "font-bold text-primary" : "font-semibold text-[#4f5d79]"
                }`}
              >
                {step.label}
              </span>
            </>
          );

          return (
            <li key={step.id} className="relative">
              {canNavigate ? (
                <Link to={step.path as string} className="group block transition-opacity hover:opacity-85">
                  {content}
                </Link>
              ) : (
                <div>{content}</div>
              )}
              {index < steps.length - 1 && (
                <span
                  className={`absolute left-14 top-6 hidden h-[2px] w-[calc(100%-3.5rem)] md:block ${
                    isDone ? "bg-primary" : "bg-[#c3cad9]"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default CheckoutSteps;
