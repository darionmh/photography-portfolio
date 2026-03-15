export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var d=document.documentElement;var s=localStorage.getItem('theme');if(s==='dark'){d.classList.add('dark');}else{d.classList.remove('dark');}})();`,
      }}
    />
  );
}
