import "express";

declare global {
  namespace Express {
    interface User {
      id: number;
      courseId?: number | null;
      memberId?: number | null;
    }
    interface Request {
      user?: User;
    }
  }
}
export {};
