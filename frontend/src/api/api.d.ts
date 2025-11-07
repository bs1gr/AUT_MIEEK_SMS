import type { Student } from '../types';

export interface StudentsAPI {
  getAll(skip?: number, limit?: number): Promise<Student[]>;
}

export declare const studentsAPI: StudentsAPI;
