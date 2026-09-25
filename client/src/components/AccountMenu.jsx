import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!user) return null;

  const onLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  const onChangePassword = () => {
    setOpen(false);
    navigate('/change-password');
  };

  return (
    <div className="account-menu" ref={menuRef}>
      <button className="account-menu-trigger" onClick={() => setOpen((o) => !o)}>
        {user.displayName} ▾
      </button>
      {open && (
        <div className="account-menu-dropdown">
          <button onClick={onChangePassword}>Change password</button>
          <button onClick={onLogout}>Log out</button>
        </div>
      )}
    </div>
  );
}
