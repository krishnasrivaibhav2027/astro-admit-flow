import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const checks = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "At least one uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "At least one special character",
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const allValid = checks.every((check) => check.valid);

  return (
    <div className="space-y-2 mt-2">
      <div className="text-sm font-medium text-muted-foreground">
        Password Requirements:
      </div>
      <div className="space-y-1">
        {checks.map((check, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-sm transition-all duration-300 ${
              password.length > 0
                ? check.valid
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {password.length > 0 ? (
              check.valid ? (
                <Check className="w-4 h-4 animate-in zoom-in duration-200" />
              ) : (
                <X className="w-4 h-4 animate-in zoom-in duration-200" />
              )
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
            )}
            <span className={check.valid && password.length > 0 ? "line-through" : ""}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
      {password.length > 0 && (
        <div className="mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                allValid
                  ? "bg-green-500 w-full"
                  : checks.filter((c) => c.valid).length === 2
                  ? "bg-yellow-500 w-2/3"
                  : checks.filter((c) => c.valid).length === 1
                  ? "bg-orange-500 w-1/3"
                  : "bg-red-500 w-1/4"
              }`}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {allValid ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                Strong password ✓
              </span>
            ) : (
              <span>Password strength: {checks.filter((c) => c.valid).length}/3</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface PasswordMatchProps {
  password: string;
  confirmPassword: string;
}

export const PasswordMatch = ({ password, confirmPassword }: PasswordMatchProps) => {
  if (confirmPassword.length === 0) return null;

  const matches = password === confirmPassword;

  return (
    <div
      className={`flex items-center gap-2 text-sm mt-2 transition-all duration-300 ${
        matches
          ? "text-green-600 dark:text-green-400"
          : "text-red-500 dark:text-red-400"
      }`}
    >
      {matches ? (
        <>
          <Check className="w-4 h-4 animate-in zoom-in duration-200" />
          <span className="font-medium">Passwords match ✓</span>
        </>
      ) : (
        <>
          <X className="w-4 h-4 animate-in zoom-in duration-200" />
          <span>Passwords don't match</span>
        </>
      )}
    </div>
  );
};
