import { Request, Response } from "express";
export declare function listEvents(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function listEventCards(req: Request, res: Response): Promise<void>;
export declare function updateEventCard(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function createEventCard(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function createEvent(req: Request, res: Response): Promise<void>;
export declare function updateEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function deleteEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=events.controller.d.ts.map