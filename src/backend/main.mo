import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";

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

  // ─── WebRTC Random Video Chat Signaling ───────────────────────────────────

  public type SignalMessage = {
    from : Text;
    msgType : Text;
    data : Text;
  };

  public type MatchInfo = {
    peerId : Text;
    peerCountry : Text;
    peerAge : Nat;
    isInitiator : Bool;
  };

  // waiting queue: sessionId -> (country, age)
  // NOTE: We do NOT filter by principal — anonymous users all share the same
  // principal so filtering would prevent any two users from ever matching.
  // (principalText, country, age) -- keep 3-tuple for stable variable compatibility
  let waitingQueue = Map.empty<Text, (Text, Text, Nat)>();
  let matchedPairs = Map.empty<Text, Text>(); // sessionId -> peerSessionId
  let signalStore = Map.empty<Text, [SignalMessage]>(); // sessionId -> pending messages
  let sessionInfo = Map.empty<Text, (Text, Nat)>(); // sessionId -> (country, age)

  var sessionCounter : Nat = 0;

  // Join the queue; returns a unique sessionId
  public shared ({ caller }) func joinOmegleQueue(country : Text, age : Nat) : async Text {
    sessionCounter += 1;
    let sid = "s" # sessionCounter.toText();

    // Store this session's metadata
    sessionInfo.add(sid, (country, age));

    // Look for ANY waiting session (no principal filter — works for anonymous users)
    var matchedWith : ?Text = null;
    label outer for ((wsid, (_wprinc, _wcountry, _wage)) in waitingQueue.entries()) {
      // Don't match a session with itself (safety check)
      if (wsid != sid) {
        matchedWith := ?wsid;
        break outer;
      };
    };

    switch (matchedWith) {
      case (?wsid) {
        // Remove the waiting session and pair them
        waitingQueue.remove(wsid);
        matchedPairs.add(sid, wsid);
        matchedPairs.add(wsid, sid);
        signalStore.add(sid, []);
        signalStore.add(wsid, []);
      };
      case (null) {
        // No one waiting — add ourselves to the queue
        waitingQueue.add(sid, (caller.toText(), country, age));
      };
    };
    sid
  };

  // Poll for match status
  public query func pollOmegleMatch(sid : Text) : async ?MatchInfo {
    switch (matchedPairs.get(sid)) {
      case (null) { null };
      case (?peerSid) {
        let isInit = sid < peerSid;
        let (peerCountry, peerAge) = switch (sessionInfo.get(peerSid)) {
          case (null) { ("Unknown", 20) };
          case (?info) { info };
        };
        ?{
          peerId = peerSid;
          peerCountry;
          peerAge;
          isInitiator = isInit;
        };
      };
    };
  };

  // Send a signal message to the peer
  public shared ({ caller }) func sendOmegleSignal(sid : Text, msgType : Text, data : Text) : async () {
    switch (matchedPairs.get(sid)) {
      case (null) { Runtime.trap("Not matched") };
      case (?peerSid) {
        let msg : SignalMessage = { from = sid; msgType; data };
        let existing = switch (signalStore.get(peerSid)) {
          case (null) { [] };
          case (?msgs) { msgs };
        };
        signalStore.add(peerSid, existing.concat([msg]));
      };
    };
  };

  // Drain and return pending signal messages for this session
  public shared ({ caller }) func getOmegleSignals(sid : Text) : async [SignalMessage] {
    switch (signalStore.get(sid)) {
      case (null) { [] };
      case (?msgs) {
        signalStore.add(sid, []);
        msgs;
      };
    };
  };

  // Leave / disconnect
  public shared ({ caller }) func leaveOmegleQueue(sid : Text) : async () {
    waitingQueue.remove(sid);
    sessionInfo.remove(sid);
    switch (matchedPairs.get(sid)) {
      case (null) {};
      case (?peerSid) {
        matchedPairs.remove(sid);
        matchedPairs.remove(peerSid);
        signalStore.remove(sid);
        // Notify peer by sending a "disconnect" signal
        let msg : SignalMessage = { from = sid; msgType = "disconnect"; data = "" };
        signalStore.add(peerSid, [msg]);
      };
    };
  };

  public query func getOmegleActiveCount() : async Nat {
    waitingQueue.size() + matchedPairs.size() / 2;
  };
};
