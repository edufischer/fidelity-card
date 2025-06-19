import React, { forwardRef } from "react";
import { Input } from "./input";

interface InputCurrencyProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const InputCurrency = forwardRef<HTMLInputElement, InputCurrencyProps>(
  ({ onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value.replace(/\D/g, '');
      
      if (inputValue === '') {
        e.target.value = '';
        if (onChange) onChange(e);
        return;
      }
      
      const numberValue = parseInt(inputValue, 10);
      const formattedValue = (numberValue / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      });
      
      e.target.value = formattedValue;
      if (onChange) onChange(e);
    };

    const formatInitialValue = (val: string | number | readonly string[] | undefined) => {
      if (!val || val === '') return '';
      
      let numVal: number;
      if (typeof val === 'string') {
        // If it's already formatted currency, extract the number
        const cleanValue = val.replace(/[^\d,]/g, '').replace(',', '.');
        numVal = parseFloat(cleanValue);
      } else {
        numVal = val as number;
      }
      
      if (isNaN(numVal)) return '';
      return numVal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      });
    };

    return (
      <Input
        {...props}
        ref={ref}
        value={formatInitialValue(value)}
        onChange={handleChange}
        placeholder="R$ 0,00"
      />
    );
  }
);

InputCurrency.displayName = "InputCurrency";

export { InputCurrency };