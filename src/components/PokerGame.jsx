'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CustomAuth from './CustomAuth';

const PokerGame = () => {
  const [games, setGames] = useState([]);
  const [invoice, setInvoice] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyIn, setBuyIn] = useState('');
  const [smallBlind, setSmallBlind] = useState('');
  const [bigBlind, setBigBlind] = useState('');
  const [playerLimit, setPlayerLimit] = useState('');

  useEffect(() => {
    const fetchUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) fetchGames();
    };

    fetchUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) fetchGames();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/game');
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const createGame = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          buyIn: parseFloat(buyIn), 
          smallBlind: parseFloat(smallBlind), 
          bigBlind: parseFloat(bigBlind),
          playerLimit: parseInt(playerLimit)
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }
      const newGame = await response.json();
      setGames(prevGames => [...prevGames, newGame]);
      setBuyIn('');
      setSmallBlind('');
      setBigBlind('');
      setPlayerLimit('');
    } catch (error) {
      console.error('Error creating game:', error);
      alert(error.message);
    }
  };

  const joinGame = async (gameId) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/game', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) throw new Error('Failed to join game');
      const data = await response.json();
      setInvoice(data.invoice);
      setGames(prevGames => prevGames.map(game => 
        game.id === data.game.id ? data.game : game
      ));
    } catch (error) {
      console.error('Error joining game:', error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    else {
      setUser(null);
      setGames([]);
    }
  };

  const handleAuthChange = (newUser) => {
    setUser(newUser);
    fetchGames();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <CustomAuth onAuthChange={handleAuthChange} />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Bitcoin Poker</h1>
        <button
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
      <p className="mb-4">Welcome, {user.email}</p>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Create New Game</h2>
        <input
          type="number"
          placeholder="Buy-in amount"
          value={buyIn}
          onChange={(e) => setBuyIn(e.target.value)}
          className="mr-2 p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Small Blind"
          value={smallBlind}
          onChange={(e) => setSmallBlind(e.target.value)}
          className="mr-2 p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Big Blind"
          value={bigBlind}
          onChange={(e) => setBigBlind(e.target.value)}
          className="mr-2 p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Player Limit"
          value={playerLimit}
          onChange={(e) => setPlayerLimit(e.target.value)}
          className="mr-2 p-2 border rounded"
        />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={createGame}
        >
          Create Game
        </button>
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Games:</h2>
        {games.map((game) => (
          <div key={game.id} className="border p-2 mb-2">
            <p>Game ID: {game.id}</p>
            <p>Status: {game.status}</p>
            <p>Buy-in: {game.buyIn} BTC</p>
            <p>Small Blind: {game.smallBlind} BTC</p>
            <p>Big Blind: {game.bigBlind} BTC</p>
            <p>Pot: {game.pot} BTC</p>
            <p>Players: {game.players.length} / {game.playerLimit}</p>
            {!game.players.some(player => player.id === user.id) && game.players.length < game.playerLimit && (
              <button
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mt-2"
                onClick={() => joinGame(game.id)}
              >
                Join Game
              </button>
            )}
          </div>
        ))}
      </div>
      {invoice && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Payment Required</h3>
          <p>Please pay this invoice to join the game:</p>
          <textarea
            className="w-full h-24 border p-2 mt-2"
            value={invoice}
            readOnly
          />
        </div>
      )}
    </div>
  );
};

export default PokerGame;