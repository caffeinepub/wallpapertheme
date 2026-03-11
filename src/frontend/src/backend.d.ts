import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface ImageStored {
    id: bigint;
    title: string;
    owner: Principal;
    blob: ExternalBlob;
    description: string;
    createdTimestamp: bigint;
}
export interface UserProfileForFrontend {
    age: bigint;
    country: string;
    interests: Array<string>;
    name: string;
}
export interface UserProfile {
    id: string;
    age: bigint;
    country: string;
    interests: Array<string>;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface SignalMessage {
    from: string;
    msgType: string;
    data: string;
}
export interface MatchInfo {
    peerId: string;
    peerCountry: string;
    peerAge: bigint;
    isInitiator: boolean;
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllImages(): Promise<Array<ImageStored>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserProfileFrontend(): Promise<UserProfileForFrontend | null>;
    getCallerUserRole(): Promise<UserRole>;
    getImageMetadataFrontEnd(arg0: string): Promise<string>;
    getImagesForUser(user: Principal): Promise<Array<ImageStored>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveUserProfileFrontend(profile: UserProfileForFrontend): Promise<void>;
    joinOmegleQueue(country: string, age: bigint): Promise<string>;
    pollOmegleMatch(sid: string): Promise<MatchInfo | null>;
    sendOmegleSignal(sid: string, msgType: string, data: string): Promise<void>;
    getOmegleSignals(sid: string): Promise<Array<SignalMessage>>;
    leaveOmegleQueue(sid: string): Promise<void>;
    getOmegleActiveCount(): Promise<bigint>;
}
