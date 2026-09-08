import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PhoneMaskerProps {
  phone: string;
  allocationId: string;
}

export const PhoneMasker: React.FC<PhoneMaskerProps> = ({ phone, allocationId }) => {
  const [revealed, setRevealed] = useState(false);
  const { currentUser, addAuditLog } = useAuth();

  const maskPhone = (num: string) => {
    if (!num || num.length < 4) return 'XXXXXX0000';
    return `XXXXXX${num.slice(-4)}`;
  };

  const handleReveal = () => {
    if (!revealed) {
      addAuditLog({
        user_id: currentUser.agent_id,
        action_type: 'REVEAL_PHONE',
        entity: 'allocations',
        entity_id: allocationId,
        old_value: maskPhone(phone),
        new_value: phone,
      });
      setRevealed(true);
    } else {
      setRevealed(false);
    }
  };

  return (
    <div className="inline-flex items-center space-x-2 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded font-mono text-sm">
      <span>{revealed ? phone : maskPhone(phone)}</span>
      <button
        onClick={handleReveal}
        title={revealed ? 'Hide Phone' : 'Click to Reveal (Logs to Audit Trail)'}
        className="text-gray-500 hover:text-blue-600 focus:outline-none transition-colors"
      >
        {revealed ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};
