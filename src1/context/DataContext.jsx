import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService, checkBackendHealth } from '../services/api';

const DataContext = createContext();

const initialCategories = [
  { id: 'cat_retail', name_ku: 'فرۆشتن و مارکێتینگ', name_ar: 'المبيعات والتسويق', name_en: 'Retail & Sales', icon: 'ShoppingBag' },
  { id: 'cat_tech', name_ku: 'تەکنەلۆژیا و سۆفتوێر', name_ar: 'تكنولوجيا والبرمجيات', name_en: 'Tech & Software', icon: 'Code' },
  { id: 'cat_hospitality', name_ku: 'هۆتێل و کافتریای باریستا', name_ar: 'الفنادق والمقاهي', name_en: 'Hospitality & Barista', icon: 'Coffee' },
  { id: 'cat_design', name_ku: 'دیزاین و گرافیک', name_ar: 'التصميم والجرافيك', name_en: 'Design & Media', icon: 'Palette' },
  { id: 'cat_finance', name_ku: 'ژمێریاری و دارایی', name_ar: 'المحاسبة والمالية', name_en: 'Accounting & Finance', icon: 'Calculator' },
  { id: 'cat_trades', name_ku: 'پیشە دەستییەکان و تەکسی', name_ar: 'المهن اليدوية والسياقة', name_en: 'Trades & Driving', icon: 'Wrench' }
];

const initialPaymentMethods = [
  {
    id: 'pm_fastpay',
    name: 'FastPay (فاست پای)',
    number: '0770 123 4567',
    instruction: 'تکایە 2,500 دینار بنێرە بۆ ئەم ژمارەی فاست پایە و وێنەی پسوڵەکە باربکە',
    active: true
  },
  {
    id: 'pm_fib',
    name: 'FIB (بانکی نێودەوڵەتی جیهان)',
    number: 'IQ99 FIB 0012 3456 7890',
    instruction: 'تکایە بڕی داواکراو بنێرە بۆ ئەژمێری FIB و وێنەی پسوڵەکە باربکە',
    active: true
  }
];

export const DataProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [categories] = useState(initialCategories);

  // Real User Geolocation State & Automatic Storage
  const [userLocation, setUserLocation] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ishkhwaz_user_location');
        return saved ? JSON.parse(saved) : null;
      } catch (e) {}
    }
    return null;
  });

  const [paymentMethods, setPaymentMethods] = useState(() => {
    const saved = localStorage.getItem('ishkhwaz_payment_methods');
    return saved ? JSON.parse(saved) : initialPaymentMethods;
  });

  const [commissionFee, setCommissionFee] = useState(2500);

  // Auto-detect Real Browser Geolocation on Website Load & Save
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            detectedAt: new Date().toISOString()
          };
          setUserLocation(loc);
          localStorage.setItem('ishkhwaz_user_location', JSON.stringify(loc));
        },
        (err) => {
          console.log('Location access not granted or unavailable:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Sync strictly with Live SQLite Backend REST API on Mount (Jobs & Applications)
  const syncBackendData = async () => {
    try {
      const apiJobs = await apiService.getJobs();
      if (apiJobs && Array.isArray(apiJobs)) {
        setIsBackendOnline(true);
        const mappedJobs = apiJobs.map(j => ({
          id: j.id,
          title_ku: j.title_ku || j.title,
          companyName: j.company_name || j.companyName,
          companyLogo: j.company_logo || j.companyLogo,
          companyPhone: j.company_phone || j.companyPhone,
          companyEmail: j.company_email || j.companyEmail,
          category: j.category,
          jobType: j.job_type || j.jobType,
          workplaceType: j.workplace_type || j.workplaceType,
          governorateName: j.governorate_id || j.location || 'سلێمانی',
          districtName: j.district_id || j.district || 'ناوەند',
          subDistrictName: j.sub_district_id || j.subDistrict || 'شاری نوێ',
          salaryMin: Number(j.salary_min || j.salaryMin || 1000000),
          salaryMax: Number(j.salary_max || j.salaryMax || 1500000),
          description: j.description,
          requiredSkills: typeof j.required_skills === 'string' ? JSON.parse(j.required_skills) : (j.required_skills || []),
          createdAt: j.created_at || j.createdAt,
          status: j.status || 'active'
        }));
        setJobs(mappedJobs);
        localStorage.setItem('ishkhwaz_jobs', JSON.stringify(mappedJobs));
      }

      // Fetch Applications
      const apiApps = await apiService.getApplications();
      if (apiApps && Array.isArray(apiApps)) {
        const mappedApps = apiApps.map(a => ({
          id: a.id,
          jobId: a.job_id || a.jobId,
          jobTitle: a.job_title || a.jobTitle,
          companyName: a.company_name || a.companyName,
          freelancerId: a.freelancer_id || a.freelancerId,
          freelancerName: a.freelancer_name || a.freelancerName,
          freelancerPhone: a.freelancer_phone || a.freelancerPhone,
          freelancerEmail: a.freelancer_email || a.freelancerEmail || `${a.freelancer_phone}@ishkhwaz.iq`,
          freelancerAvatar: a.freelancer_avatar || a.freelancerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          coverLetter: a.cover_letter || a.coverLetter || 'سیڤی ڕاستەوخۆ نێردراوە بۆ کارەکە',
          paymentMethod: a.payment_method || a.paymentMethod || 'FastPay',
          paymentTxId: a.payment_tx_id || a.paymentTxId,
          paymentStatus: a.payment_status || a.paymentStatus || 'approved',
          companyStatus: a.company_status || a.companyStatus || 'pending',
          createdAt: a.created_at || a.createdAt
        }));
        setApplications(mappedApps);
        localStorage.setItem('ishkhwaz_applications', JSON.stringify(mappedApps));
      }
    } catch (e) {
      console.log('Backend sync error');
    }
  };

  useEffect(() => {
    syncBackendData();
  }, []);

  const addJob = async (jobData) => {
    const newJob = {
      id: 'job_' + Date.now(),
      ...jobData,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    setJobs([newJob, ...jobs]);

    try {
      await apiService.createJob({
        title_ku: jobData.title_ku,
        company_name: jobData.companyName,
        category: jobData.category,
        governorate_id: jobData.governorateName,
        salary_min: jobData.salaryMin,
        salary_max: jobData.salaryMax
      });
      syncBackendData();
    } catch (e) {}
    return newJob;
  };

  const applyForJob = async (applicationData) => {
    const newApp = {
      id: 'app_' + Date.now(),
      ...applicationData,
      createdAt: new Date().toISOString().split('T')[0],
      paymentStatus: 'approved',
      companyStatus: 'pending'
    };
    setApplications([newApp, ...applications]);

    try {
      await apiService.submitApplication(applicationData);
      syncBackendData();
    } catch (e) {}
    return newApp;
  };

  const updateCompanyApplicantStatus = async (appId, status) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, companyStatus: status } : a));

    try {
      await apiService.updateCompanyApplicantStatus(appId, status);
      syncBackendData();
    } catch (e) {}
  };

  const verifyApplicationPayment = async (appId, isApproved) => {
    const status = isApproved ? 'approved' : 'rejected';
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, paymentStatus: status } : a));

    try {
      await apiService.verifyApplicationPayment(appId, isApproved);
      syncBackendData();
    } catch (e) {}
  };

  return (
    <DataContext.Provider value={{
      jobs,
      applications,
      categories,
      paymentMethods,
      commissionFee,
      isBackendOnline,
      userLocation,
      setUserLocation,
      addJob,
      applyForJob,
      updateCompanyApplicantStatus,
      verifyApplicationPayment,
      syncBackendData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
