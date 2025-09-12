import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeMap = {
    sm: { width: 32, height: 32, text: 'text-base' },
    md: { width: 48, height: 48, text: 'text-xl' },
    lg: { width: 64, height: 64, text: 'text-2xl' },
    xl: { width: 80, height: 80, text: 'text-3xl' },
  };

  const { width, height, text } = sizeMap[size];

  return (
    <Link href="/" className={`flex items-center space-x-3 group ${className}`}>
      <div className="relative transition-all duration-300 group-hover:scale-105">
        <Image
          src="/logo.PNG"
          alt="VMAX Logo"
          width={width}
          height={height}
          className="object-contain rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent ${text}`}>
            VMAX Sales
          </span>
          <span className="text-xs text-slate-400 font-medium hidden md:inline-block">
            Analytics Platform
          </span>
        </div>
      )}
    </Link>
  );
}
