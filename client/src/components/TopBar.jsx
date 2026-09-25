import AccountMenu from './AccountMenu.jsx';

export default function TopBar() {
  return (
    <header className="topbar">
      <span className="topbar-title">Sample Auth App</span>
      <AccountMenu />
    </header>
  );
}
