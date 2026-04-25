"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  name?: string;
  defaultValue?: number;
  value?: number;
  onChange?: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
};

export function MoneyInput({
  name,
  defaultValue,
  value: controlled,
  onChange,
  min = 0,
  max,
  className,
  id,
  required,
  placeholder,
}: Props) {
  const [internal, setInternal] = useState<number>(
    controlled ?? defaultValue ?? 0,
  );
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled! : internal;

  useEffect(() => {
    if (isControlled) setInternal(controlled!);
  }, [controlled, isControlled]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(num)) return;
    if (max !== undefined && num > max) return;
    if (num < min) return;
    if (!isControlled) setInternal(num);
    onChange?.(num);
  }

  return (
    <>
      <Input
        type="text"
        inputMode="numeric"
        id={id}
        value={value.toLocaleString("ko-KR")}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        className={cn("font-mono", className)}
      />
      {name ? (
        <input type="hidden" name={name} value={value} readOnly />
      ) : null}
    </>
  );
}
