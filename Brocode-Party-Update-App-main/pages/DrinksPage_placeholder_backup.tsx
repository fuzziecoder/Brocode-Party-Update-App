import React from 'react';
import Button from '../components/common/Button';

const DrinksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4 text-amber-500">Drinks Menu Updating...</h1>
      <p className="text-zinc-400 mb-8 max-w-md text-center">
        We are applying critical updates to the Drinks Menu layout.
        Please check back shortly.
        You can still access Home, Chat, and Profile pages.
      </p>
      <Button onClick={() => window.location.reload()}>Refresh Page</Button>
    </div>
  );
};

export default DrinksPage;
