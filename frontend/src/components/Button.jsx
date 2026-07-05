const BASE =
  'inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition-all ' +
  'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

const VARIANTS = {
  primary:   'bg-accent text-navy-950 hover:bg-accent-dark shadow-lg shadow-accent/25',
  secondary: 'bg-navy-800 border border-navy-600 text-slate-200 hover:border-accent/40 hover:bg-navy-750',
  ghost:     'bg-transparent border border-navy-600 text-slate-400 hover:text-slate-200 hover:border-navy-500',
  danger:    'bg-transparent border border-navy-600 text-slate-400 hover:text-rep-bad hover:border-rep-bad/40',
};

// Alturas mínimas seguem a recomendação de touch target móvel (>= 44px).
const SIZES = {
  lg: 'w-full text-[15px] min-h-[52px] px-5',
  md: 'text-sm min-h-[44px] px-4',
  sm: 'text-[13px] min-h-[38px] px-3',
};

export default function Button({ variant = 'primary', size = 'lg', className = '', ...props }) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.lg} ${className}`}
      {...props}
    />
  );
}
