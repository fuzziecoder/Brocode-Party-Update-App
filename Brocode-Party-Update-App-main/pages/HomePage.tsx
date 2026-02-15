import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, MapPin, Calendar, Clock, Banknote, HelpCircle, Loader2, Sparkles, Crown, Trash2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  Spot,
  Invitation,
  InvitationStatus,
  PaymentStatus,
  UserRole,
  UserProfile,
  SpotSponsor,
} from "../types";
import SponsorBadge from "../components/common/SponsorBadge";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";
import GlowButton from "../components/common/GlowButton";
import Textarea from "../components/common/Textarea";
import { spotService, invitationService, paymentService, notificationService, profileService, sponsorService } from "../services/database";
import { supabase } from "../services/supabase";
import { checkDatabaseSetup, getSetupInstructions } from "../services/dbCheck";
import { useNotifications } from "../contexts/NotificationsContext";
import { format } from "date-fns";
import ShinyText from "../components/common/ShinyText";
import GradientText from "../components/common/GradientText";
import StarBorder from "../components/common/StarBorder";

declare const google: any;

const HomePage: React.FC = () => {
  const { profile } = useAuth();
  const { notify } = useNotifications();

  const [spot, setSpot] = useState<Spot | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateSpotModalOpen, setCreateSpotModalOpen] = useState(false);
  const [isEditSpotModalOpen, setIsEditSpotModalOpen] = useState(false);
  const [dbSetupError, setDbSetupError] = useState<string | null>(null);

  // Sponsor State
  const [spotSponsor, setSpotSponsor] = useState<SpotSponsor | null>(null);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [sponsorUsers, setSponsorUsers] = useState<UserProfile[]>([]);
  const [selectedSponsorId, setSelectedSponsorId] = useState("");
  const [sponsorAmount, setSponsorAmount] = useState("");
  const [sponsorMessage, setSponsorMessage] = useState("");
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [editFormData, setEditFormData] = useState({
    location: '',
    date: '',
    timing: '',
    budget: '',
    description: '',
    feedback: '',
  });

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

        const members = inv.map(i => i.profiles).filter(Boolean);
        const uniqueMembers = Array.from(new Map(members.map(p => [p.id, p])).values());
        setSponsorUsers(uniqueMembers); // Use members as potential sponsors

        const currentSponsor = await sponsorService.getSponsor(spotData.id);
        setSpotSponsor(currentSponsor);
      } else {
        setInvitations([]);
        setSponsorUsers([]);
        setSpotSponsor(null);
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
    let sponsorChannel: any = null;

    if (spot) {
      // Subscribe to spot changes
      spotChannel = spotService.subscribeToSpots((payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          fetchData();
          if (payload.eventType === 'INSERT') {
            // Notify all users in database
            notificationService.createNotificationForAllUsers(
              "New Spot Created!",
              `A new spot has been created at ${payload.new.location}`
            ).catch(err => console.error('Error notifying all users:', err));
            // Also notify current user locally
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
            // Notify all users about RSVP updates
            notificationService.createNotificationForAllUsers(
              "RSVP Updated",
              `Someone ${statusMessages[payload.new.status] || 'updated their RSVP'}`
            ).catch(err => console.error('Error notifying all users:', err));
            // Also notify current user locally
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

  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!spot || !mapRef.current || typeof google === "undefined" || !profile) return;

    const isAdminUser = profile.role === UserRole.ADMIN;

    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: {
          lat: spot.latitude ?? 37.7749,
          lng: spot.longitude ?? -122.4194,
        },
        zoom: 15,
        disableDefaultUI: true,
      });

      // Add marker for the spot location
      if (spot.latitude && spot.longitude) {
        markerRef.current = new google.maps.Marker({
          position: { lat: spot.latitude, lng: spot.longitude },
          map: mapInstance.current,
          draggable: isAdminUser,
        });

        // If admin, allow dragging marker to update location
        if (isAdminUser && markerRef.current) {
          markerRef.current.addListener('dragend', async (e: any) => {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();

            try {
              await spotService.updateSpot(spot.id, {
                latitude: newLat,
                longitude: newLng,
              });
              await fetchData();
            } catch (error: any) {
              console.error('Failed to update location:', error);
              alert('Failed to update location. Please try again.');
            }
          });

          // Also allow clicking on map to set location (admin only)
          mapInstance.current.addListener('click', async (e: any) => {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();

            // Move marker to clicked location
            if (markerRef.current) {
              markerRef.current.setPosition({ lat: newLat, lng: newLng });
            }

            try {
              await spotService.updateSpot(spot.id, {
                latitude: newLat,
                longitude: newLng,
              });
              await fetchData();
            } catch (error: any) {
              console.error('Failed to update location:', error);
              alert('Failed to update location. Please try again.');
            }
          });
        }
      } else if (isAdminUser) {
        // If no location set, allow admin to click on map to set it
        mapInstance.current.addListener('click', async (e: any) => {
          const newLat = e.latLng.lat();
          const newLng = e.latLng.lng();

          // Create marker if it doesn't exist
          if (!markerRef.current) {
            markerRef.current = new google.maps.Marker({
              position: { lat: newLat, lng: newLng },
              map: mapInstance.current,
              draggable: true,
            });

            markerRef.current.addListener('dragend', async (dragEvent: any) => {
              const dragLat = dragEvent.latLng.lat();
              const dragLng = dragEvent.latLng.lng();

              try {
                await spotService.updateSpot(spot.id, {
                  latitude: dragLat,
                  longitude: dragLng,
                });
                await fetchData();
              } catch (error: any) {
                console.error('Failed to update location:', error);
                alert('Failed to update location. Please try again.');
              }
            });
          } else {
            markerRef.current.setPosition({ lat: newLat, lng: newLng });
          }

          try {
            await spotService.updateSpot(spot.id, {
              latitude: newLat,
              longitude: newLng,
            });
            await fetchData();
          } catch (error: any) {
            console.error('Failed to update location:', error);
            alert('Failed to update location. Please try again.');
          }
        });
      }
    } else {
      // Update marker position if spot location changed
      if (markerRef.current && spot.latitude && spot.longitude) {
        markerRef.current.setPosition({ lat: spot.latitude, lng: spot.longitude });
      } else if (markerRef.current && (!spot.latitude || !spot.longitude)) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }
  }, [spot, profile, fetchData]);

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
      await notificationService.createNotificationForAllUsers(
        "New Spot Created!",
        `A new spot has been created at ${newSpotData.location} on ${new Date(newSpotData.date).toLocaleDateString()}`
      );
      // Also notify current user locally
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

  // Helper function to get UUID from profile ID
  const getUserIdAsUUID = async (profileId: string): Promise<string> => {
    if (!profile) {
      throw new Error('No user profile available');
    }

    // If it's already a UUID, return it
    if (profileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return profileId;
    }

    // Otherwise, look it up in the database
    const cleanPhone = profile.phone ? profile.phone.replace(/\D/g, '') : '';

    // Try to find user by phone, email, or username
    let dbProfile = null;
    let lookupError = null;

    if (cleanPhone) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (!error && data) {
        dbProfile = data;
      } else {
        lookupError = error;
      }
    }

    if (!dbProfile && profile.email) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', profile.email)
        .maybeSingle();
      if (!error && data) {
        dbProfile = data;
      }
    }

    if (!dbProfile && profile.username) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', profile.username)
        .maybeSingle();
      if (!error && data) {
        dbProfile = data;
      }
    }

    // If found, return the UUID
    if (dbProfile) {
      return dbProfile.id;
    }

    // If not found, try to create the user profile in the database
    try {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          name: profile.name,
          username: profile.username,
          phone: cleanPhone || null,
          email: profile.email || null,
          password: profile.password || '',
          role: profile.role || 'user',
          profile_pic_url: profile.profile_pic_url || 'https://api.dicebear.com/7.x/thumbs/svg?seed=default',
          location: profile.location || 'Broville',
          is_verified: profile.isVerified || true,
        })
        .select('id')
        .single();

      if (createError) {
        // If creation fails (e.g., username already exists), try one more lookup
        const { data: finalLookup } = await supabase
          .from('profiles')
          .select('id')
          .or(`phone.eq.${cleanPhone},email.eq.${profile.email || ''},username.eq.${profile.username}`)
          .maybeSingle();

        if (finalLookup) {
          return finalLookup.id;
        }

        throw new Error(`Unable to create or find user profile: ${createError.message}`);
      }

      return newProfile.id;
    } catch (createErr: any) {
      // Final fallback: if we still can't create/find, throw a helpful error
      throw new Error(`User profile not found in database and could not be created. Please ensure you are logged in with a valid account. Error: ${createErr.message}`);
    }
  };

  const handleRSVP = async (
    invitationId: string,
    status: InvitationStatus
  ) => {
    if (!profile || !spot) return;

    try {
      await invitationService.updateInvitationStatus(invitationId, status);

      // Create or update payment when user confirms
      if (status === InvitationStatus.CONFIRMED) {
        try {
          // Get UUID for user ID
          const userId = await getUserIdAsUUID(profile.id);

          await paymentService.upsertPayment({
            spot_id: spot.id,
            user_id: userId,
            status: PaymentStatus.NOT_PAID,
          });
        } catch (paymentError) {
          console.error("Failed to create payment entry:", paymentError);
          // Don't block RSVP update if payment creation fails
        }
      }

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
      // Get UUID for user ID
      const userId = await getUserIdAsUUID(profile.id);

      await invitationService.upsertInvitation({
        spot_id: spot.id,
        user_id: userId,
        status,
      });

      // Create or update payment when user confirms
      if (status === InvitationStatus.CONFIRMED) {
        try {
          await paymentService.upsertPayment({
            spot_id: spot.id,
            user_id: userId,
            status: PaymentStatus.NOT_PAID,
          });
        } catch (paymentError) {
          console.error("Failed to create payment entry:", paymentError);
          // Don't block RSVP creation if payment creation fails
        }
      }

      // Refresh data to show updated status
      await fetchData();
    } catch (error: any) {
      console.error("Failed to create RSVP:", error);
      alert(`Failed to create RSVP: ${error.message || 'Please try again.'}`);
    }
  };

  // Handle spot update
  const handleUpdateSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpot || !profile) return;

    try {
      let userId = profile.id;
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.eq.${profile.email},phone.eq.${profile.phone},username.eq.${profile.username}`)
          .single();
        if (dbProfile) userId = dbProfile.id;
      }

      await spotService.updateSpot(editingSpot.id, {
        location: editFormData.location,
        date: editFormData.date,
        timing: editFormData.timing,
        budget: Number(editFormData.budget),
        description: editFormData.description,
        feedback: editFormData.feedback,
        day: new Date(editFormData.date).toLocaleDateString('en-US', { weekday: 'long' }),
      });

      setIsEditSpotModalOpen(false);
      setEditingSpot(null);
      await fetchData();
      await notificationService.createNotificationForAllUsers("Spot Updated", "Spot details have been updated successfully");
      notify("Spot Updated", "Spot details have been updated successfully");
    } catch (error: any) {
      alert(`Failed to update spot: ${error.message || 'Please try again.'}`);
    }
  };

  // Handle spot delete
  const handleDeleteSpot = async (spotId: string) => {
    try {
      await spotService.deleteSpot(spotId);
      await fetchData();
      await notificationService.createNotificationForAllUsers("Spot Deleted", "Spot has been deleted successfully");
      notify("Spot Deleted", "Spot has been deleted successfully");
    } catch (error: any) {
      alert(`Failed to delete spot: ${error.message || 'Please try again.'}`);
    }
  };

  const handleAssignSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spot || !selectedSponsorId) return;

    try {
      await sponsorService.sponsorSpot({
        spot_id: spot.id,
        sponsor_id: selectedSponsorId,
        amount_covered: Number(sponsorAmount) || spot.budget, // Default to budget if empty
        message: sponsorMessage
      });

      notify("Sponsor Assigned", "User has been marked as sponsor! 🎉");
      setIsSponsorModalOpen(false);

      // Refresh data
      const currentSponsor = await sponsorService.getSponsor(spot.id);
      setSpotSponsor(currentSponsor);

      // Notify everyone
      const sponsorName = sponsorUsers.find(u => u.id === selectedSponsorId)?.name || "Someone";
      await notificationService.createNotificationForAllUsers(
        "New Sponsor! 👑",
        `${sponsorName} is sponsoring the spot!`
      );
    } catch (error: any) {
      console.error("Error assigning sponsor:", error);
      alert("Failed to assign sponsor.");
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
        <ShinyText
          text="THE SPOT"
          className="text-4xl font-black"
          style={{ fontFamily: "'Zen Dots', cursive" }}
          speed={3}
          color="#ffffff"
          shineColor="#6366f1"
        />
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
              <StarBorder color={spotSponsor ? "#fbbf24" : "#6366f1"} speed="5s" className="w-full cursor-target">
                <div className="space-y-4">
                  {/* Sponsor Banner */}
                  {spotSponsor && spotSponsor.profiles && (
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/50 flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-full">
                        <Crown size={24} className="text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-amber-200 text-xs font-bold uppercase tracking-widest">Sponsored Event</p>
                          <SponsorBadge size="sm" animate />
                        </div>
                        <p className="text-white text-sm">
                          Bill covered by <span className="font-bold text-amber-400 text-lg">{spotSponsor.profiles.name}</span>
                        </p>
                        {spotSponsor.message && (
                          <p className="text-amber-200/80 text-xs italic mt-1">"{spotSponsor.message}"</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="inline-flex items-center px-4 py-2 bg-zinc-800/80 border border-zinc-700/50 rounded-full backdrop-blur-sm cursor-target">
                        <ShinyText
                          text={spot.location}
                          className="text-lg font-bold"
                          color="#9ca3af"
                          shineColor="#ffffff"
                          speed={2.5}
                        />
                      </div>
                      <p className="text-zinc-400">
                        {new Date(spot.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} at {spot.timing}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setIsSponsorModalOpen(true)}
                          className="!bg-amber-500/10 !text-amber-400 !border-amber-500/50 hover:!bg-amber-500/20"
                        >
                          <Crown size={14} className="mr-1" /> Sponsor
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingSpot(spot);
                            setEditFormData({
                              location: spot.location,
                              date: spot.date.split('T')[0],
                              timing: spot.timing,
                              budget: spot.budget.toString(),
                              description: spot.description || '',
                              feedback: spot.feedback || '',
                            });
                            setIsEditSpotModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this spot?')) {
                              handleDeleteSpot(spot.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                  {spot.description && (
                    <div>
                      <h3 className="text-sm font-bold text-zinc-500 uppercase mb-2">Description</h3>
                      <p className="text-zinc-300">{spot.description}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">Budget:</span>
                    <span className="font-bold text-white">Rs.{spot.budget} / person</span>
                  </div>
                </div>
              </StarBorder>

              <StarBorder color="#6366f1" speed="6s" className="w-full cursor-target">
                <div className="h-[250px] md:h-[350px] overflow-hidden relative rounded-[16px]">
                  {isAdmin && (
                    <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
                      Admin: Click on map or drag marker to update location
                    </div>
                  )}
                  <div ref={mapRef} className="w-full h-full" />
                </div>
              </StarBorder>

              {/* RSVP CONFIRMATION SECTION */}
              <StarBorder color="#6366f1" speed="7s" className="w-full cursor-target">
                <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4">Confirm Your Attendance</h2>
                <p className="text-xs md:text-sm text-zinc-400 mb-4">
                  Let us know if you're coming to this spot!
                </p>

                {myInvitation ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRSVP(myInvitation.id, InvitationStatus.CONFIRMED)
                        }
                        variant={myInvitation.status === InvitationStatus.CONFIRMED ? "primary" : "secondary"}
                        className="flex-1 min-w-[100px] text-xs md:text-sm"
                      >
                        ✓ Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant={myInvitation.status === InvitationStatus.DECLINED ? "primary" : "secondary"}
                        onClick={() =>
                          handleRSVP(myInvitation.id, InvitationStatus.DECLINED)
                        }
                        className="flex-1 min-w-[100px] text-xs md:text-sm"
                      >
                        ✗ Not Interested
                      </Button>
                      <Button
                        size="sm"
                        variant={myInvitation.status === InvitationStatus.PENDING ? "primary" : "secondary"}
                        onClick={() =>
                          handleRSVP(myInvitation.id, InvitationStatus.PENDING)
                        }
                        className="flex-1 min-w-[100px] text-xs md:text-sm"
                      >
                        ⏳ Waitlist
                      </Button>
                    </div>
                    <div className="text-xs text-zinc-500">
                      Your current status: <span className="font-bold uppercase">{myInvitation.status}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCreateRSVP(InvitationStatus.CONFIRMED)}
                      className="flex-1 min-w-[100px] text-xs md:text-sm"
                    >
                      ✓ Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreateRSVP(InvitationStatus.DECLINED)}
                      className="flex-1 min-w-[100px] text-xs md:text-sm"
                    >
                      ✗ Not Interested
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreateRSVP(InvitationStatus.PENDING)}
                      className="flex-1 min-w-[100px] text-xs md:text-sm"
                    >
                      ⏳ Waitlist
                    </Button>
                  </div>
                )}
              </StarBorder>

              {/* RSVP STATUS - REAL-TIME UPDATES */}
              <Card className="p-4 md:p-6">
                <h2 className="text-base md:text-lg font-bold mb-4">Who's Coming? ({invitations.filter(i => i.status === InvitationStatus.CONFIRMED).length})</h2>

                <div className="space-y-3">
                  {invitations
                    .sort((a, b) => {
                      // Sort: Confirmed first, then Pending, then Declined
                      const statusOrder: Record<string, number> = { confirmed: 0, pending: 1, declined: 2 };
                      return (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
                    })
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-zinc-900/50 rounded-lg border border-white/5"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.location.href = `/dashboard/profile/${inv.profiles.id}`}
                        >
                          <img
                            src={inv.profiles.profile_pic_url || "https://api.dicebear.com/7.x/thumbs/svg?seed=default"}
                            alt={inv.profiles.name}
                            className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm md:text-base block truncate">{inv.profiles.name}</span>
                              {inv.profiles.is_sponsor && <SponsorBadge size="sm" showLabel={false} animate={false} />}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">
                              @{inv.profiles.username}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap ${inv.status === InvitationStatus.CONFIRMED
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : inv.status === InvitationStatus.PENDING
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            {inv.status}
                          </span>
                          {isAdmin && inv.profiles.id !== profile?.id && (
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete user ${inv.profiles.name}? This will remove all their data.`)) {
                                  try {
                                    await profileService.deleteProfile(inv.profiles.id);
                                    alert('User deleted successfully');
                                    window.location.reload();
                                  } catch (err: any) {
                                    alert(`Failed to delete user: ${err.message}`);
                                  }
                                }
                              }}
                              className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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

      {/* EDIT SPOT MODAL */}
      <Modal
        isOpen={isEditSpotModalOpen}
        onClose={() => {
          setIsEditSpotModalOpen(false);
          setEditingSpot(null);
        }}
        title="Edit Spot"
      >
        <form onSubmit={handleUpdateSpot} className="space-y-4">
          <Input
            label="Location"
            value={editFormData.location}
            onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
            required
          />
          <Input
            type="date"
            label="Date"
            value={editFormData.date}
            onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
            required
          />
          <Input
            type="time"
            label="Time"
            value={editFormData.timing}
            onChange={(e) => setEditFormData({ ...editFormData, timing: e.target.value })}
            required
          />
          <Input
            type="number"
            label="Budget"
            value={editFormData.budget}
            onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={editFormData.description}
            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
          />
          <Textarea
            label="Admin Feedback"
            value={editFormData.feedback}
            onChange={(e) => setEditFormData({ ...editFormData, feedback: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Update Spot</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditSpotModalOpen(false);
                setEditingSpot(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sponsor Modal */}
      <Modal
        isOpen={isSponsorModalOpen}
        onClose={() => setIsSponsorModalOpen(false)}
        title="Assign Sponsor 👑"
      >
        <form onSubmit={handleAssignSponsor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Select User</label>
            <select
              value={selectedSponsorId}
              onChange={(e) => setSelectedSponsorId(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
              required
            >
              <option value="">Select a member...</option>
              {sponsorUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
              ))}
            </select>
          </div>

          <Input
            label="Amount Covered (₹)"
            type="number"
            value={sponsorAmount}
            onChange={(e) => setSponsorAmount(e.target.value)}
            placeholder={`Default: ${spot?.budget}`}
          />

          <Input
            label="Sponsor Message"
            value={sponsorMessage}
            onChange={(e) => setSponsorMessage(e.target.value)}
            placeholder="e.g. Drinks on me! 🍻"
          />

          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-200">
            ⚠️ <strong>Warning:</strong> Checking this will mark the user as a permanent Sponsor (earning the badge) and calculate the bill as ₹0 for everyone else.
          </div>

          <Button type="submit" variant="primary" className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold">
            Assign Sponsor
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default HomePage;

