export interface Profile {
  id: string;
  full_name: string;
  email: string;
  gender: "Male" | "Female" | "Other";
  hostel: string;
  phone: string;
  avatar_url?: string;
  university_id?: string;
  level?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileData {
  id: string;
  full_name: string;
  email: string;
  gender: "Male" | "Female" | "Other";
  hostel: string;
  phone: string;
  avatar_url?: string;
  university_id?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  email?: string;
  gender?: "Male" | "Female" | "Other";
  hostel?: string;
  phone?: string;
  avatar_url?: string;
  university_id?: string;
}

export interface University {
  id: string;
  name: string;
  created_at: string;
}
