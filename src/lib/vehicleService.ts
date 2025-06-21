
import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  onSnapshot,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { vehicleConverter, FirestoreVehicle, Vehicle } from "./types";

export const VehicleService = {
  async getAllVehicles(): Promise<Vehicle[]> {
    const q = query(collection(db, 'vehicles')).withConverter(vehicleConverter);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  },

  async getVehicleById(id: string): Promise<Vehicle | null> {
    const docRef = doc(db, 'vehicles', id).withConverter(vehicleConverter);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  },

  async createVehicle(vehicleData: Omit<Vehicle, 'id'>): Promise<string> {
    const dataToCreate = vehicleConverter.toFirestore(vehicleData as FirestoreVehicle);
    const docRef = await addDoc(
      collection(db, 'vehicles'),
      dataToCreate
    );
    return docRef.id;
  },

  async updateVehicle(id: string, vehicleData: Partial<Omit<Vehicle, 'id'>>): Promise<void> {
    const docRef = doc(db, 'vehicles', id);
    const dataToUpdate: Partial<FirestoreVehicle> = {
      ...vehicleData,
      updatedAt: Timestamp.now()
    };
    await updateDoc(docRef, dataToUpdate);
  },

  async deleteVehicle(id: string): Promise<void> {
    const docRef = doc(db, 'vehicles', id);
    await deleteDoc(docRef);
  },

  subscribeToVehicles(
    callback: (vehicles: Vehicle[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(collection(db, 'vehicles')).withConverter(vehicleConverter);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vehicles = snapshot.docs.map(docSnapshot => docSnapshot.data());
      callback(vehicles);
    }, (error) => {
      console.error("Error subscribing to vehicles:", error);
      if (onError) {
        onError(error);
      }
    });
    return unsubscribe;
  }
};
