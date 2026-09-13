export function PasswordPolicyHint({ className = 'text-[11px]' }: { className?: string }) {
  return (
    <p className={`${className} md:whitespace-nowrap`} style={{ color: '#999' }}>
      8文字以上で、大文字・小文字・数字・記号のうち
      <br className="md:hidden" />
      3種類以上を含めてください
    </p>
  );
}
