import React, { forwardRef } from "react";
import { Input } from "./input";

interface InputCPFProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const InputCPF = forwardRef<HTMLInputElement, InputCPFProps>(
  ({ onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '');
      const formattedValue = value
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
      
      e.target.value = formattedValue;
      if (onChange) onChange(e);
    };

    return (
      <Input
        {...props}
        ref={ref}
        onChange={handleChange}
        placeholder="000.000.000-00"
        maxLength={14}
      />
    );
  }
);

InputCPF.displayName = "InputCPF";

export { InputCPF };
