export type CalendarEvent = {
    id: number;
    course_id: number | null;
    eventname: string;
    eventdescription: string | null;
    start_dt: string; // ISO
    end_dt: string;   // ISO
    handicap_yn: number; // 0/1
    nine_id: number | null;
    user_id: number | null;
  };
  
