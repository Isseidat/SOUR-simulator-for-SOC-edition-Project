import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import clsx from "clsx";

/**
 * CustomDropdown Component
 * Chuẩn giao diện hiện đại như Dashboard Custom Modal:
 * - Bo viền liền mạch với trigger khi mở
 * - Tương thích Dark/Light theme hoàn hảo
 * - Hỗ trợ dot màu sắc thái, icon tiền tố và dấu Check cho item được chọn
 * - Tự động đóng khi click ra ngoài hoặc bấm ESC
 */
export default function CustomDropdown({
  value,
  onChange,
  options = [],
  placeholder = "Chọn...",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  label,
  icon: LeadingIcon,
  accent = "cyan", // 'cyan' | 'indigo' | 'emerald' | 'neutral'
  rounded = "xl", // 'xl' | 'lg' | 'md'
  lightOnly = false,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng khi click bên ngoài dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Cấu hình bo góc theo prop
  const roundedButton = rounded === "lg" ? "rounded-lg" : rounded === "md" ? "rounded-md" : "rounded-xl";
  const roundedButtonOpen = rounded === "lg" ? "rounded-t-lg" : rounded === "md" ? "rounded-t-md" : "rounded-t-xl";
  const roundedMenu = rounded === "lg" ? "rounded-b-lg" : rounded === "md" ? "rounded-b-md" : "rounded-b-xl";

  // Theme màu nhấn
  const accentClasses = {
    cyan: {
      borderActive: lightOnly ? "border-cyan-500 ring-2 ring-cyan-500/10" : "border-cyan-500 dark:border-cyan-500",
      textActive: lightOnly ? "text-cyan-500" : "text-cyan-500 dark:text-cyan-400",
      bgActive: lightOnly ? "bg-cyan-50 text-cyan-700 font-semibold" : "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 font-bold",
      checkIcon: lightOnly ? "text-cyan-600" : "text-cyan-600 dark:text-cyan-400",
    },
    indigo: {
      borderActive: lightOnly ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-indigo-500 dark:border-indigo-500",
      textActive: lightOnly ? "text-indigo-500" : "text-indigo-500 dark:text-indigo-400",
      bgActive: lightOnly ? "bg-indigo-50 text-indigo-700 font-semibold" : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold",
      checkIcon: lightOnly ? "text-indigo-600" : "text-indigo-600 dark:text-indigo-400",
    },
    emerald: {
      borderActive: lightOnly ? "border-emerald-500 ring-2 ring-emerald-500/10" : "border-emerald-500 dark:border-emerald-500",
      textActive: lightOnly ? "text-emerald-500" : "text-emerald-500 dark:text-emerald-400",
      bgActive: lightOnly ? "bg-emerald-50 text-emerald-700 font-semibold" : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold",
      checkIcon: lightOnly ? "text-emerald-600" : "text-emerald-600 dark:text-emerald-400",
    },
    neutral: {
      borderActive: "border-neutral-900 ring-2 ring-neutral-900/5",
      textActive: "text-neutral-900",
      bgActive: "bg-neutral-100 text-neutral-950 font-semibold",
      checkIcon: "text-neutral-900",
    },
  }[accent] || {
    borderActive: lightOnly ? "border-cyan-500" : "border-cyan-500 dark:border-cyan-500",
    textActive: lightOnly ? "text-cyan-500" : "text-cyan-500 dark:text-cyan-400",
    bgActive: lightOnly ? "bg-cyan-50 text-cyan-600 font-bold" : "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 font-bold",
    checkIcon: lightOnly ? "text-cyan-600" : "text-cyan-600 dark:text-cyan-400",
  };

  return (
    <div className={clsx("relative inline-block", className)} ref={dropdownRef}>
      {label && (
        <label
          className={clsx(
            "block text-xs font-semibold mb-1.5",
            lightOnly ? "text-neutral-700" : "text-slate-700 dark:text-slate-300"
          )}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={clsx(
          "w-full py-2 px-3 flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer font-medium text-xs select-none border",
          lightOnly
            ? "bg-neutral-50/70 border-neutral-300 text-neutral-900"
            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen
            ? clsx(roundedButtonOpen, "shadow-xs bg-white", accentClasses.borderActive)
            : clsx(
                roundedButton,
                lightOnly
                  ? "hover:border-neutral-400 hover:bg-neutral-50/90"
                  : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
              ),
          buttonClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {LeadingIcon && (
            <LeadingIcon
              size={14}
              className={clsx(lightOnly ? "text-neutral-400" : "text-slate-400", "shrink-0")}
            />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          {selectedOption?.color && (
            <span
              className="w-2 h-2 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className="truncate">
            <span className="font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
            {selectedOption?.description && (
              <span className="text-neutral-400 font-normal ml-1.5 text-[11px] truncate">
                ({selectedOption.description})
              </span>
            )}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={clsx(
            lightOnly ? "text-neutral-400" : "text-slate-400",
            "transition-transform duration-200 shrink-0",
            isOpen && clsx("rotate-180", accentClasses.textActive)
          )}
        />
      </button>

      {/* Dropdown Menu Liền Mạch */}
      {isOpen && (
        <div
          className={clsx(
            "absolute top-[calc(100%-1px)] left-0 min-w-full w-full z-50 border-x border-b shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150",
            lightOnly
              ? "bg-white border-neutral-900 divide-y divide-neutral-100 text-neutral-900"
              : "bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80",
            roundedMenu,
            accentClasses.borderActive,
            menuClassName
          )}
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <div
                key={String(option.value)}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={clsx(
                  "px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs select-none",
                  isSelected
                    ? accentClasses.bgActive
                    : lightOnly
                    ? "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {option.icon && (
                    <span className="shrink-0">{option.icon}</span>
                  )}
                  {option.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <div className="flex flex-col text-left truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs">{option.label}</span>
                      {option.badge && (
                        <span className="px-1.5 py-0.2 text-[9.5px] rounded bg-neutral-200/70 text-neutral-700 font-medium">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {option.description && (
                      <span className="text-[10.5px] text-neutral-400 font-normal truncate">
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check
                    size={14}
                    className={clsx("shrink-0", accentClasses.checkIcon)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
