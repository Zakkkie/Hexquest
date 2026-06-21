import { useState, useRef, useEffect } from 'react';

/**
 * Reusable hook to handle collapse states for HUD tutorial and hint banners.
 * Automatically expands the banner if a key identifier (like progress description or visual state) changes.
 */
export function useCollapsibleHint(
  autoExpandKey: any,
  playUiSound: (type: 'CLICK') => void
) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const lastValueRef = useRef<any>(null);

  useEffect(() => {
    // Disabled auto-expansion on update to comply with minimal noise/user requests
    lastValueRef.current = autoExpandKey;
  }, [autoExpandKey]);

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    playUiSound('CLICK');
    setIsCollapsed(prev => !prev);
  };

  return {
    isCollapsed,
    setIsCollapsed,
    handleToggleCollapse,
  };
}

