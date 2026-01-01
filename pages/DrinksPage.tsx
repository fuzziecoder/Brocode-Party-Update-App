import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { UserRole, Spot, Drink, PaymentStatus } from "../types";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import { spotService, paymentService, drinkService } from "../services/database";
import { supabase } from "../services/supabase";
import { Plus, ThumbsUp, Trash2, Loader2 } from "lucide-react";

const DrinksPage: React.FC = () => {
  const { profile } = useAuth();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDrinkName, setNewDrinkName] = useState("");
  const [newDrinkImage, setNewDrinkImage] = useState("");

  const fetchData = useCallback(async () => {
    if (!profile) return;
    
    try {
      const spotData = await spotService.getUpcomingSpot();
      setSpot(spotData);

      if (spotData) {
        // Check if user has paid
        const payments = await paymentService.getPayments(spotData.id);
        const userPayment = payments.find((p) => p.user_id === profile.id);
        setIsPaid(userPayment?.status === PaymentStatus.PAID);

        // Only fetch drinks if user is paid
        if (userPayment?.status === PaymentStatus.PAID) {
          const drinksData = await drinkService.getDrinks(spotData.id);
          setDrinks(drinksData);
        } else {
          setDrinks([]);
        }
      } else {
        setDrinks([]);
        setIsPaid(false);
      }
    } catch (error) {
      console.error("Error loading drinks data:", error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for drinks
    if (spot && isPaid) {
      const channel = supabase
        .channel(`drinks-${spot.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'drinks',
            filter: `spot_id=eq.${spot.id}`,
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchData, spot?.id, isPaid]);

  const handleAddDrink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spot || !profile || !newDrinkName.trim()) return;

    try {
      await drinkService.createDrink({
        spot_id: spot.id,
        name: newDrinkName.trim(),
        image_url: newDrinkImage.trim() || undefined,
        suggested_by: profile.id,
      });
      setNewDrinkName("");
      setNewDrinkImage("");
      setIsModalOpen(false);
      await fetchData();
    } catch (error: any) {
      alert(`Failed to add drink: ${error.message || 'Please try again.'}`);
    }
  };

  const handleVote = async (drinkId: string) => {
    if (!profile) return;

    try {
      await drinkService.voteForDrink(drinkId, profile.id);
      await fetchData();
    } catch (error: any) {
      alert(`Failed to vote: ${error.message || 'Please try again.'}`);
    }
  };

  const handleDeleteDrink = async (drinkId: string) => {
    if (!confirm("Are you sure you want to delete this drink?")) return;

    try {
      await drinkService.deleteDrink(drinkId);
      await fetchData();
    } catch (error: any) {
      alert(`Failed to delete drink: ${error.message || 'Please try again.'}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin mx-auto mb-4" size={32} />
        <p>Loading drinks...</p>
      </div>
    );
  }

  if (!spot) {
    return (
      <Card>
        <p className="text-center text-gray-400">
          No upcoming spot available.
        </p>
      </Card>
    );
  }

  if (!isPaid) {
    return (
      <div className="space-y-6 pb-20 max-w-6xl mx-auto px-4">
        <h1 className="text-2xl md:text-3xl font-bold">Drinks</h1>
        <Card className="p-8 text-center">
          <p className="text-gray-400 mb-4">
            You need to complete payment first to access the drinks section.
          </p>
          <Button onClick={() => window.location.href = '/dashboard/payment'}>
            Go to Payment
          </Button>
        </Card>
      </div>
    );
  }

  const hasUserVoted = (drink: Drink) => {
    return profile && drink.voted_by.includes(profile.id);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Drinks</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Add Drink
        </Button>
      </div>

      {drinks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-400 mb-4">No drinks suggested yet.</p>
          <p className="text-sm text-gray-500">Be the first to suggest a drink!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {drinks.map((drink) => (
            <Card key={drink.id} className="p-4 md:p-6">
              <div className="relative group">
                {drink.image_url ? (
                  <img
                    src={drink.image_url}
                    alt={drink.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-zinc-800 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-zinc-500 text-4xl">🍺</span>
                  </div>
                )}
                <button
                  onClick={() => handleDeleteDrink(drink.id)}
                  className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">{drink.name}</h3>
              
              {drink.profiles && (
                <p className="text-sm text-zinc-400 mb-4">
                  Suggested by {drink.profiles.name}
                </p>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleVote(drink.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    hasUserVoted(drink)
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  <ThumbsUp size={16} />
                  <span>{drink.votes}</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewDrinkName("");
          setNewDrinkImage("");
        }}
        title="Add Drink"
      >
        <form onSubmit={handleAddDrink} className="space-y-4">
          <Input
            label="Drink Name"
            value={newDrinkName}
            onChange={(e) => setNewDrinkName(e.target.value)}
            placeholder="e.g., Kingfisher, Old Monk, etc."
            required
          />
          <Input
            label="Image URL (Optional)"
            value={newDrinkImage}
            onChange={(e) => setNewDrinkImage(e.target.value)}
            placeholder="https://example.com/drink-image.jpg"
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Add Drink
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setNewDrinkName("");
                setNewDrinkImage("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DrinksPage;
