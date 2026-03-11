import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

import Storage "blob-storage/Storage";
import Array "mo:core/Array";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // User Profile System
  public type UserProfile = {
    id : Text;
    name : Text;
    country : Text;
    age : Nat;
    interests : [Text];
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type UserProfileForFrontend = {
    name : Text;
    country : Text;
    age : Nat;
    interests : [Text];
  };

  public query ({ caller }) func getCallerUserProfileFrontend() : async ?UserProfileForFrontend {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (userProfiles.get(caller)) {
      case (null) { null };
      case (?profile) {
        ?{
          name = profile.name;
          country = profile.country;
          age = profile.age;
          interests = profile.interests;
        };
      };
    };
  };

  public shared ({ caller }) func saveUserProfileFrontend(profile : UserProfileForFrontend) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    switch (userProfiles.get(caller)) {
      case (null) {
        userProfiles.add(
          caller,
          {
            id = caller.toText();
            name = profile.name;
            country = profile.country;
            age = profile.age;
            interests = profile.interests;
          },
        );
      };
      case (?existingProfile) {
        let updatedProfile = { existingProfile with
          name = profile.name;
          country = profile.country;
          age = profile.age;
          interests = profile.interests;
        };
        userProfiles.add(caller, updatedProfile);
      };
    };
  };

  public type Geolocation = {
    latitude : Float;
    longitude : Float;
  };

  type ImageStored = {
    id : Nat;
    owner : Principal;
    createdTimestamp : Nat;
    blob : Storage.ExternalBlob;
    title : Text;
    description : Text;
  };

  let images = Map.empty<Nat, ImageStored>();

  func createImage(id : Nat, blob : Storage.ExternalBlob, owner : Principal) : ImageStored {
    {
      id;
      blob;
      owner;
      title = "unknown";
      description = "unknown";
      createdTimestamp = id;
    };
  };

  public query ({ caller }) func getImagesForUser(user : Principal) : async [ImageStored] {
    let filtered = images.filter(
      func(_id, storedImage) {
        storedImage.owner == user;
      }
    );
    filtered.values().toArray();
  };

  public query ({ caller }) func getAllImages() : async [ImageStored] {
    images.values().toArray();
  };

  public query ({ caller }) func getImageMetadataFrontEnd(_ : Text) : async Text {
    Runtime.trap("image not found");
  };
};
