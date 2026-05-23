// Simulate existing user in localStorage after login
let existingUser = {
  id: '1234',
  email: 'testuser999@studentcompanion.com',
  username: 'testuser999',
  firstName: '',
  lastName: ''
};

// Simulate Supabase auth.getUser() returning user without metadata
let normalizedUser = {
  id: '1234',
  email: 'testuser999@studentcompanion.com',
  username: 'testuser999',
  firstName: 'testuser999',
  lastName: '',
  profilePic: ''
};

const mergedUser = (existingUser.id === normalizedUser.id) ? {
    ...existingUser,
    ...normalizedUser,
    username: existingUser.username || normalizedUser.username,
    firstName: existingUser.firstName || normalizedUser.firstName,
    lastName: existingUser.lastName || normalizedUser.lastName,
    profilePic: existingUser.profilePic || normalizedUser.profilePic,
    bio: existingUser.bio || normalizedUser.bio || 'No bio added yet.',
    memberSince: existingUser.memberSince || normalizedUser.memberSince || null
} : normalizedUser;

console.log("Merged User:", mergedUser);

// Now simulate enrichCurrentUserProfile
let profileData = {
    username: null,
    first_name: null,
    last_name: null,
    email: null,
    avatar_url: null,
    bio: null,
    created_at: null
};

let user = mergedUser;
const enrichedUser = {
    ...user,
    email: profileData.email || user.email || '',
    username: profileData.username || user.username || '',
    firstName: profileData.first_name || user.firstName || '',
    lastName: profileData.last_name || user.lastName || '',
    profilePic: profileData.avatar_url || user.profilePic || null,
    bio: profileData.bio || user.bio || 'No bio added yet.',
    memberSince: profileData.created_at || null
};

console.log("Enriched User:", enrichedUser);

// Now simulate getUserDisplayName
function getUserDisplayName(u) {
    if (!u) return 'Student';
    const candidates = [
        u.username,
        u.firstName,
        u.name,
        u.lastName,
        u.email ? u.email.split('@')[0] : ''
    ];
    const match = candidates.find(value => typeof value === 'string' && value.trim());
    return match ? match.trim() : 'Student';
}

console.log("Display Name:", getUserDisplayName(enrichedUser));
