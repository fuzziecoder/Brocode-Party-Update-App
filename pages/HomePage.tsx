import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  Spot,
  Invitation,
  InvitationStatus,
  UserRole,
} from "../types";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import GlowButton from "../components/common/GlowButton";
import Textarea from "../components/common/Textarea";
import { spotService, invitationService } from "../services/database";
import { supabase } from "../services/supabase";
import { checkDatabaseSetup, getSetupInstructions } from "../services/dbCheck";
import { useNotifications } from "../contexts/NotificationsContext";
import { format } from "date-fns";

declare const google: any;

const HomePage: React.FC = () => {
  const { profile } = useAuth();
  const { notify } = useNotifications();

  const [spot, setSpot] = useState<Spot | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateSpotModalOpen, setCreateSpotModalOpen] = useState(false);
  const [dbSetupError, setDbSetupError] = useState<string | null>(null);

  const [newSpotData, setNewSpotData] = useState({
    location: "",
    date: new Date().toISOString().split("T")[0],
    timing: "21:00",
    budget: "50",
    description: "",
    latitude: 37.7749,
    longitude: -122.4194,
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  /* ----------------------------- CHECK DB SETUP ----------------------------- */

  useEffect(() => {
    const checkSetup = async () => {
      const setup = await checkDatabaseSetup();
      if (!setup.isSetup) {
        setDbSetupError(getSetupInstructions(setup.missingTables));
      } else {
        setDbSetupError(null);
      }
    };
    checkSetup();
  }, []);

  /* ----------------------------- FETCH DATA ----------------------------- */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDbSetupError(null);
    try {
      const spotData = await spotService.getUpcomingSpot();
      setSpot(spotData);

      if (spotData) {
        const inv = await invitationService.getInvitations(spotData.id);
        setInvitations(inv);
      } else {
        setInvitations([]);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
        const setup = await checkDatabaseSetup();
        setDbSetupError(getSetupInstructions(setup.missingTables));
      } else {
        setDbSetupError(err.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    let spotChannel: any = null;
    let invitationChannel: any = null;

    if (spot) {
      // Subscribe to spot changes
      spotChannel = spotService.subscribeToSpots((payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          fetchData();
          if (payload.eventType === 'INSERT') {
            notify("New Spot Created!", `A new spot has been created at ${payload.new.location}`);
          }
        }
      });

      // Subscribe to invitation changes for this spot
      invitationChannel = invitationService.subscribeToInvitations(
        spot.id,
        (payload) => {
          fetchData();
          // Notify when someone updates their RSVP
          if (payload.eventType === 'UPDATE' && payload.new.status !== payload.old.status) {
            const statusMessages: Record<string, string> = {
              confirmed: 'confirmed their attendance',
              pending: 'is on the waitlist',
              declined: 'declined the invitation'
            };
            notify("RSVP Updated", `Someone ${statusMessages[payload.new.status] || 'updated their RSVP'}`);
          }
        }
      );
    }

    return () => {
      if (spotChannel) {
        supabase.removeChannel(spotChannel);
      }
      if (invitationChannel) {
        supabase.removeChannel(invitationChannel);
      }
    };
  }, [fetchData, spot?.id, notify]);

  /* ----------------------------- GOOGLE MAP ----------------------------- */

  useEffect(() => {
    if (!spot || !mapRef.current || typeof google === "undefined") return;

    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: {
          lat: spot.latitude ?? 37.7749,
          lng: spot.longitude ?? -122.4194,
        },
        zoom: 15,
        disableDefaultUI: true,
      });
    }
  }, [spot]);

  /* ----------------------------- CREATE SPOT ----------------------------- */

  const handleCreateSpot = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    const budgetNum = Number(newSpotData.budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      alert("Invalid budget");
      return;
    }

    try {
      // Ensure profile.id is a valid UUID
      let userId = profile.id;
      
      // If profile.id is not a UUID (like "admin"), get the UUID from database
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.eq.${profile.email},phone.eq.${profile.phone},username.eq.${profile.username}`)
          .single();
        
        if (dbProfile) {
          userId = dbProfile.id;
        } else {
          throw new Error('User profile not found in database. Please ensure you are logged in with a valid account.');
        }
      }

      // Create the spot
      const newSpot = await spotService.createSpot({
        date: newSpotData.date,
        day: new Date(newSpotData.date).toLocaleDateString("en-US", {
          weekday: "long",
        }),
        timing: newSpotData.timing,
        budget: budgetNum,
        location: newSpotData.location,
        description: newSpotData.description,
        created_by: userId,
        latitude: newSpotData.latitude,
        longitude: newSpotData.longitude,
      });

      // Get all users to create invitations for them
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id');

      if (!usersError && allUsers) {
        // Create invitations for all users (pending status by default)
        const invitationPromises = allUsers.map((user) =>
          invitationService.upsertInvitation({
            spot_id: newSpot.id,
            user_id: user.id,
            status: InvitationStatus.PENDING,
          })
        );

        await Promise.all(invitationPromises);
      }

      // Auto-confirm the creator's invitation
      await invitationService.upsertInvitation({
        spot_id: newSpot.id,
        user_id: userId,
        status: InvitationStatus.CONFIRMED,
      });

      // Notify all users about the new spot
      notify("New Spot Created!", `A new spot has been created at ${newSpotData.location} on ${new Date(newSpotData.date).toLocaleDateString()}`);

      setCreateSpotModalOpen(false);
      setNewSpotData({
        location: "",
        date: new Date().toISOString().split("T")[0],
        timing: "21:00",
        budget: "50",
        description: "",
        latitude: 37.7749,
        longitude: -122.4194,
      });
      
      // Refresh data to show the new spot
      await fetchData();
    } catch (error: any) {
      console.error("Failed to create spot:", error);
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        const setup = await checkDatabaseSetup();
        const instructions = getSetupInstructions(setup.missingTables);
        alert(`Database tables not found!\n\n${instructions}`);
      } else {
        alert(`Failed to create spot: ${error.message || 'Unknown error'}`);
      }
    }
  };

  /* ----------------------------- RSVP ----------------------------- */

  const handleRSVP = async (
    invitationId: string,
    status: InvitationStatus
  ) => {
    try {
      await invitationService.updateInvitationStatus(invitationId, status);
      // Refresh data to show updated status immediately
      await fetchData();
    } catch (error: any) {
      console.error("Failed to update RSVP:", error);
      alert(`Failed to update RSVP: ${error.message || 'Please try again.'}`);
    }
  };

  // Handle RSVP if user doesn't have an invitation yet
  const handleCreateRSVP = async (status: InvitationStatus) => {
    if (!profile || !spot) return;

    try {
      await invitationService.upsertInvitation({
        spot_id: spot.id,
        user_id: profile.id,
        status,
      });
      // Real-time subscription will update the UI automatically
    } catch (error) {
      console.error("Failed to create RSVP:", error);
      alert("Failed to create RSVP. Please try again.");
    }
  };

  const myInvitation = invitations.find(
    (i) => i.user_id === profile?.id
  );

  const isAdmin = profile?.role === UserRole.ADMIN;

  if (loading && !spot) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  /* ----------------------------- UI ----------------------------- */

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <header className="flex justify-between items-center">
        <h1 className="text-4xl font-black">THE SPOT</h1>
        {isAdmin && (
          <GlowButton onClick={() => setCreateSpotModalOpen(true)}>
            New Meetup
          </GlowButton>
        )}
      </header>

      {dbSetupError && (
        <Card className="p-6 bg-red-900/20 border-red-500/50">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-red-400">⚠️ Database Setup Required</h2>
            <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono bg-black/30 p-4 rounded">
              {dbSetupError}
            </pre>
            <Button
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              variant="secondary"
            >
              Open Supabase Dashboard
            </Button>
          </div>
        </Card>
      )}

      {!dbSetupError && (
        <>
          {!spot ? (
            <Card className="p-20 text-center">No Active Spot</Card>
          ) : (
            <>
              {/* SPOT DETAILS */}
              <Card>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-indigo-400 mb-2">{spot.location}</h2>
                    <p className="text-zinc-400">
                      {new Date(spot.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} at {spot.timing}
                    </p>
                  </div>
                  {spot.description && (
                    <div>
                      <h3 className="text-sm font-bold text-zinc-500 uppercase mb-2">Description</h3>
                      <p className="text-zinc-300">{spot.description}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">Budget:</span>
                    <span className="font-bold text-white">${spot.budget} / person</span>
                  </div>
                </div>
              </Card>

              <Card className="h-[350px] p-0 overflow-hidden">
                <div ref={mapRef} className="w-full h-full" />
              </Card>

              {/* RSVP CONFIRMATION SECTION */}
              <Card>
                <h2 className="text-lg font-bold mb-4">Confirm Your Attendance</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Let us know if you're coming to this spot!
                </p>

                {myInvitation ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRSVP(myInvitation.id, InvitationStatus.CONFIRMED)
                        }
                        variant={myInvitation.status === InvitationStatus.CONFIRMED ? "default" : "secondary"}
                      >
                        ✓ Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant={myInvitation.status === InvitationStatus.DECLINED ? "default" : "secondary"}
                        onClick={() =>
                          handleRSVP(myInvitation.id, InvitationStatus.DECLINED)
                        }
                      >
                        ✗ Not Interested
                      </Button>
                      <Button
                        size="sm"
                        variant={myInvitation.status === InvitationStatus.PENDING ? "default" : "secondary"}
                        onClick={() =>
                          handleRSVP(myInvitation.id, InvitationStatus.PENDING)
                        }
                      >
                        ⏳ Waitlist
                      </Button>
                    </div>
                    <div className="text-xs text-zinc-500">
                      Your current status: <span className="font-bold uppercase">{myInvitation.status}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCreateRSVP(InvitationStatus.CONFIRMED)}
                    >
                      ✓ Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreateRSVP(InvitationStatus.DECLINED)}
                    >
                      ✗ Not Interested
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreateRSVP(InvitationStatus.PENDING)}
                    >
                      ⏳ Waitlist
                    </Button>
                  </div>
                )}
              </Card>

              {/* RSVP STATUS - REAL-TIME UPDATES */}
              <Card>
                <h2 className="text-lg font-bold mb-4">Who's Coming? ({invitations.filter(i => i.status === InvitationStatus.CONFIRMED).length})</h2>
                
                <div className="space-y-3">
                  {invitations
                    .sort((a, b) => {
                      // Sort: Confirmed first, then Pending, then Declined
                      const statusOrder = { confirmed: 0, pending: 1, declined: 2 };
                      return statusOrder[a.status] - statusOrder[b.status];
                    })
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={inv.profiles.profile_pic_url || "https://api.dicebear.com/7.x/thumbs/svg?seed=default"}
                            alt={inv.profiles.name}
                            className="w-10 h-10 rounded-full border border-white/10"
                          />
                          <div>
                            <span className="font-medium text-sm">{inv.profiles.name}</span>
                            <div className="text-xs text-zinc-500">
                              @{inv.profiles.username}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            inv.status === InvitationStatus.CONFIRMED
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : inv.status === InvitationStatus.PENDING
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  
                  {invitations.length === 0 && (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      No responses yet. Be the first to confirm!
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* CREATE SPOT MODAL */}
      <Modal
        isOpen={isCreateSpotModalOpen}
        onClose={() => setCreateSpotModalOpen(false)}
        title="Create Spot"
      >
        <form onSubmit={handleCreateSpot} className="space-y-4">
          <Input
            label="Location"
            value={newSpotData.location}
            onChange={(e) =>
              setNewSpotData({ ...newSpotData, location: e.target.value })
            }
          />
          <Input
            type="date"
            label="Date"
            value={newSpotData.date}
            onChange={(e) =>
              setNewSpotData({ ...newSpotData, date: e.target.value })
            }
          />
          <Input
            type="time"
            label="Time"
            value={newSpotData.timing}
            onChange={(e) =>
              setNewSpotData({ ...newSpotData, timing: e.target.value })
            }
          />
          <Input
            type="number"
            label="Budget"
            value={newSpotData.budget}
            onChange={(e) =>
              setNewSpotData({ ...newSpotData, budget: e.target.value })
            }
          />
          <Textarea
            label="Description"
            value={newSpotData.description}
            onChange={(e) =>
              setNewSpotData({
                ...newSpotData,
                description: e.target.value,
              })
            }
          />
          <Button type="submit" className="w-full">
            Create Spot
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default HomePage;
