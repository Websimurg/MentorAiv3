"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Lesson {
  id: number;
  title: string;
  duration: string;
  videoUrl: string;
  completed: boolean;
}

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  level: "Başlangıç" | "Orta" | "İleri";
  category: string;
  lessons: Lesson[];
}

export default function Egitimler() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<{[key: number]: number}>({});
  const [activeTab, setActiveTab] = useState<"all" | "inProgress" | "completed">("all");
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  // Real-time subscriptions - Kurslar ve ilerleme değişince otomatik güncelle
  useEffect(() => {
    const coursesChannel = supabase
      .channel('courses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses'
        },
        (payload) => {
          console.log('Courses değişikliği algılandı:', payload);
          loadCourses(); // Otomatik yenile
        }
      )
      .subscribe();

    const progressChannel = supabase
      .channel('course-progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_progress'
        },
        (payload) => {
          console.log('Course progress değişikliği algılandı:', payload);
          loadCourses(); // Otomatik yenile
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(coursesChannel);
      supabase.removeChannel(progressChannel);
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    loadCourses();
  };

  const loadCourses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Supabase'den tüm kursları yükle
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Courses from Supabase:', coursesData);
    console.log('Courses error:', coursesError);

    if (!coursesData || coursesData.length === 0) {
      console.log('No courses found in Supabase');
      setCourses([]);
      return;
    }

    const adminCourses = coursesData;
    
    // Supabase'den tamamlanan dersleri yükle
    const { data: progressData } = await supabase
      .from('course_progress')
      .select('*')
      .eq('user_id', user.id);

    const completedLessons: {[key: number]: number[]} = {};
    if (progressData) {
      progressData.forEach(p => {
        completedLessons[parseInt(p.course_id)] = p.completed_lessons || [];
      });
    }
    
    // Admin eğitimlerini bizim formatımıza dönüştür
    console.log('Admin courses from Supabase:', adminCourses);
    const formattedAdminCourses = adminCourses.map((course: any) => {
      console.log('Processing course:', course);
      console.log('Course lessons:', course.lessons);
      const courseId = parseInt(course.id) || Date.now();
      const courseLessons = course.lessons?.map((lesson: any) => {
        const lessonId = parseInt(lesson.id) || Date.now();
        const isCompleted = completedLessons[courseId]?.includes(lessonId) || false;
        return {
          id: lessonId,
          title: lesson.title,
          duration: lesson.duration,
          videoUrl: lesson.videoUrl,
          completed: isCompleted
        };
      }) || [];
      
      const completedCount = courseLessons.filter((l: any) => l.completed).length;
      
      return {
        id: courseId,
        title: course.title,
        description: course.description,
        thumbnail: "🎬",
        instructor: "Admin",
        totalLessons: courseLessons.length,
        completedLessons: completedCount,
        duration: course.duration || "0 dk",
        level: "Başlangıç" as const,
        category: course.category || "Platform",
        lessons: courseLessons
      };
    });
    
    // Sadece Admin kursları
    console.log('Formatted courses:', formattedAdminCourses);
    setCourses(formattedAdminCourses);
  };

  const loadProgress = () => {
    const saved = localStorage.getItem("courseProgress");
    if (saved) {
      setProgress(JSON.parse(saved));
    }
  };

  const saveProgress = (newProgress: {[key: number]: number}) => {
    setProgress(newProgress);
    localStorage.setItem("courseProgress", JSON.stringify(newProgress));
  };

  const markLessonComplete = async (courseId: number, lessonId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mevcut ilerlemeyi al
    const { data: existingProgress } = await supabase
      .from('course_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId.toString())
      .single();

    let completedLessons = existingProgress?.completed_lessons || [];
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
    }

    const course = courses.find(c => c.id === courseId);
    const progressPercent = course ? (completedLessons.length / course.totalLessons) * 100 : 0;

    // Supabase'e kaydet (upsert)
    await supabase
      .from('course_progress')
      .upsert({
        user_id: user.id,
        course_id: courseId.toString(),
        completed_lessons: completedLessons,
        progress_percent: Math.round(progressPercent)
      }, { onConflict: 'user_id,course_id' });

    // Update local state
    const updatedCourses = courses.map(course => {
      if (course.id === courseId) {
        const updatedLessons = course.lessons.map(lesson => 
          lesson.id === lessonId ? { ...lesson, completed: true } : lesson
        );
        const completedCount = updatedLessons.filter(l => l.completed).length;
        return { ...course, lessons: updatedLessons, completedLessons: completedCount };
      }
      return course;
    });
    setCourses(updatedCourses);
    
    // Mevcut dersi güncelle
    if (currentLesson && currentLesson.id === lessonId) {
      setCurrentLesson({ ...currentLesson, completed: true });
    }
    
    const updatedCourse = updatedCourses.find(c => c.id === courseId);
    if (updatedCourse) {
      const progressPercent = (updatedCourse.completedLessons / updatedCourse.totalLessons) * 100;
      setProgress(prev => ({ ...prev, [courseId]: progressPercent }));
    }
  };

  const filteredCourses = courses.filter(course => {
    if (activeTab === "inProgress") return course.completedLessons > 0 && course.completedLessons < course.totalLessons;
    if (activeTab === "completed") return course.completedLessons === course.totalLessons;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Sidebar - Course List */}
        <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto max-h-screen lg:h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-3xl">📚</span>
              Eğitim Merkezi
            </h1>
            <p className="text-gray-600 text-sm mb-6">Tamamen Ücretsiz!</p>

            {/* Course List */}
            <div className="space-y-3">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => {
                    setSelectedCourse(course);
                    const nextLesson = course.lessons.find(l => !l.completed) || course.lessons[0];
                    setCurrentLesson(nextLesson);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedCourse?.id === course.id
                      ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{course.thumbnail}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm">{course.title}</h3>
                      <p className="text-xs text-gray-500">{course.instructor}</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${(course.completedLessons / course.totalLessons) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {course.completedLessons}/{course.totalLessons} Ders
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto w-full">
          {selectedCourse && currentLesson ? (
            <div className="p-4 md:p-6 lg:p-8">
              {/* Course Header */}
              <div className="mb-4 md:mb-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold">
                    {selectedCourse.level}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                    {selectedCourse.category}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">{currentLesson.title}</h2>
                <p className="text-sm md:text-base text-gray-600">{selectedCourse.title} • {selectedCourse.instructor}</p>
              </div>

              {/* Video Player */}
              <div className="bg-black rounded-3xl aspect-video overflow-hidden mb-6">
                {currentLesson.videoUrl ? (
                  <iframe
                    src={(() => {
                      let url = currentLesson.videoUrl;
                      // YouTube watch URL
                      if (url.includes('youtube.com/watch')) {
                        const videoId = url.split('v=')[1]?.split('&')[0];
                        return `https://www.youtube.com/embed/${videoId}`;
                      }
                      // YouTube short URL
                      if (url.includes('youtu.be/')) {
                        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                        return `https://www.youtube.com/embed/${videoId}`;
                      }
                      // YouTube embed URL (zaten doğru format)
                      if (url.includes('youtube.com/embed/')) {
                        return url;
                      }
                      // Diğer videolar (Vimeo, etc.)
                      return url;
                    })()}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentLesson.title}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-9xl mb-4">🎥</div>
                      <p className="text-gray-600 text-xl font-semibold">Video Yok</p>
                      <p className="text-gray-500 text-sm mt-2">Süre: {currentLesson.duration}</p>
                      <p className="text-gray-400 text-xs mt-4">Admin tarafından video eklenmemiş</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Controls */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
                <button
                  onClick={() => markLessonComplete(selectedCourse.id, currentLesson.id)}
                  disabled={currentLesson.completed}
                  className={`flex-1 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold transition-all text-sm md:text-base ${
                    currentLesson.completed
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl'
                  }`}
                >
                  {currentLesson.completed ? '✓ Tamamlandı' : '✓ Dersi Tamamla'}
                </button>
                <button
                  onClick={() => {
                    const currentIndex = selectedCourse.lessons.findIndex(l => l.id === currentLesson.id);
                    if (currentIndex < selectedCourse.lessons.length - 1) {
                      setCurrentLesson(selectedCourse.lessons[currentIndex + 1]);
                    }
                  }}
                  disabled={selectedCourse.lessons.findIndex(l => l.id === currentLesson.id) === selectedCourse.lessons.length - 1}
                  className="flex-1 sm:flex-initial px-6 md:px-8 py-3 md:py-4 bg-white border-2 border-purple-400 text-purple-600 rounded-xl md:rounded-2xl font-bold hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  Sonraki Ders →
                </button>
              </div>

              {/* Course Description */}
              <div className="bg-white rounded-2xl p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Kurs Hakkında</h3>
                <p className="text-gray-600">{selectedCourse.description}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-9xl mb-6">📚</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">Eğitime Başlayın</h2>
                <p className="text-gray-600 text-lg">Soldan bir kurs seçin ve öğrenmeye başlayın!</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Lesson List */}
        {selectedCourse && (
          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 overflow-y-auto max-h-96 lg:max-h-screen lg:h-screen">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Kurs İçeriği</h3>
              <div className="space-y-2">
                {selectedCourse.lessons.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLesson(lesson)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      currentLesson?.id === lesson.id
                        ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lesson.completed ? "✅" : "⭕"}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{index + 1}. {lesson.title}</p>
                        <p className="text-xs text-gray-500">{lesson.duration}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}