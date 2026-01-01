import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { UserProfile, User } from "../types";
import { mockApi } from "../services/mockApi";
import { profileService } from "../services/database";
import { supabase } from "../services/supabase";

/* -------------------------------------------------------------------------- */
/* Types */
/* -------------------------------------------------------------------------- */

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

/* -------------------------------------------------------------------------- */
/* Storage keys */
/* -------------------------------------------------------------------------- */

const USER_KEY = "brocode_user";
const PROFILE_KEY = "brocode_profile";

/* -------------------------------------------------------------------------- */
/* Provider */
/* -------------------------------------------------------------------------- */

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Login */
  /* ------------------------------------------------------------------------ */

  const login = async (identifier: string, password: string) => {
    setLoading(true);

    try {
      // First try to get profile from Supabase
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${identifier},phone.eq.${identifier},username.eq.${identifier}`)
        .eq('password', password)
        .single();

      if (!profileError && profiles) {
        // Found in Supabase - use UUID from database
        const userProfile = profiles as UserProfile;
        const loggedInUser: User = {
          id: userProfile.id,
          email: userProfile.email,
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        };

        setUser(loggedInUser);
        setProfile(userProfile);
        localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
        localStorage.setItem(PROFILE_KEY, JSON.stringify(userProfile));
        setLoading(false);
        return;
      }
    } catch (err) {
      console.log('Supabase login failed, trying mockApi...');
    }

    // Fallback to mockApi for development
    const { user: loggedInUser, profile: userProfile } =
      await mockApi.login(identifier, password);

    // If using mockApi, try to find the UUID in Supabase
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.eq.${identifier},phone.eq.${identifier},username.eq.${identifier}`)
        .single();

      if (dbProfile) {
        // Use the UUID from database
        loggedInUser.id = dbProfile.id;
        userProfile.id = dbProfile.id;
      }
    } catch (err) {
      console.log('Could not find profile in database, using mock ID');
    }

    setUser(loggedInUser);
    setProfile(userProfile);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(userProfile));
    setLoading(false);
  };

  /* ------------------------------------------------------------------------ */
  /* Logout */
  /* ------------------------------------------------------------------------ */

  const logout = () => {
    setUser(null);
    setProfile(null);

    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PROFILE_KEY);
  };

  /* ------------------------------------------------------------------------ */
  /* Update profile */
  /* ------------------------------------------------------------------------ */

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error("No user logged in");

    try {
      // First try to update in Supabase
      let userId = user.id;
      
      // If user.id is not a UUID, try to find it in database
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.eq.${profile?.email || ''},phone.eq.${profile?.phone || ''},username.eq.${profile?.username || ''}`)
          .single();
        
        if (dbProfile) {
          userId = dbProfile.id;
        }
      }

      // Update in database
      const updatedProfile = await profileService.updateProfile(userId, updates);
      
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Error updating profile in database, trying mockApi fallback:', error);
      // Fallback to mockApi for development
      try {
        const updatedProfile = await mockApi.updateProfile(user.id, updates);
        setProfile(updatedProfile);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
      } catch (mockError) {
        console.error('Failed to update profile:', mockError);
        throw mockError;
      }
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    login,
    logout,
    updateProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
