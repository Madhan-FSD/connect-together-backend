export const seedUsers = [
  {
    email: "john.doe@example.com",
    passwordHash: "Password@123",
    firstName: "John",
    lastName: "Doe",
    gender: "Male",
    dob: new Date("1985-06-10"),
    isVerified: true,
    firebaseUID: "",
    role: "PARENT",
    avatar: {
      url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500",
      public_id: "avatar1",
    },
    profileBanner: {
      url: "https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200",
      public_id: "banner1",
    },
    profileHeadline: "Software Architect & Mentor",
    about: "Passionate about education technology and helping children learn.",
    addresses: [
      {
        street: "12 MG Road",
        city: "Bangalore",
        state: "Karnataka",
        country: "India",
        zipCode: "560001",
        isPrimary: true,
      },
    ],
    skills: [
      { name: "Java", endorsements: 12 },
      { name: "Node.js", endorsements: 10 },
      { name: "Leadership", endorsements: 25 },
    ],
    certifications: [
      {
        name: "AWS Certified Architect",
        issuingOrganization: "Amazon",
        issueDate: new Date("2020-05-10"),
      },
    ],
    experiences: [
      {
        title: "Tech Lead",
        company: "Infosys",
        location: "Bangalore",
        startDate: new Date("2018-01-01"),
        description: "Leading cloud engineering team.",
      },
    ],
    interests: [
      { name: "Machine Learning" },
      { name: "Cycling" },
      { name: "Parenting Education" },
    ],
    projects: [
      {
        name: "SmartEdu Portal",
        description: "Learning platform for kids.",
        role: "Architect",
        startDate: new Date("2021-02-01"),
      },
    ],
    featuredContent: {
      introHeadline: "Tech leader helping build creative minds",
      items: [
        {
          headline: "Guiding learning journeys",
          summary: "Helping parents and kids engage with learning tools.",
          category: "Education",
        },
      ],
      generatedAt: new Date(),
    },
    children: [
      {
        firstName: "Emily",
        lastName: "Doe",
        gender: "Female",
        dob: new Date("2015-09-15"),
        firebaseUID: "",
        role: "CHILD",
        addresses: [
          {
            street: "12 MG Road",
            city: "Bangalore",
            state: "Karnataka",
            country: "India",
            zipCode: "560001",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1506702315536-dd8b83e2dcf9?w=500",
          public_id: "child_avatar1",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1200",
          public_id: "child_banner1",
        },
        about: "Loves science and robotics.",
        interests: [
          { name: "Robotics", category: "STEM" },
          { name: "Drawing", category: "Art" },
        ],
        skills: [
          { name: "Math", proficiency: "INTERMEDIATE" },
          { name: "Sketching", proficiency: "BEGINNER" },
        ],
        projects: [
          {
            name: "Mini Robot",
            description: "Built a moving robot using Arduino",
          },
        ],
        educations: [
          {
            institution: "Greenwood High",
            degree: "Primary",
            startDate: new Date("2020-05-01"),
          },
        ],
        activities: [
          {
            subject: "Math",
            lessonsCompleted: 10,
            avgScore: 85,
            timeSpent: 120,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },
      {
        firstName: "Ryan",
        lastName: "Doe",
        gender: "Male",
        dob: new Date("2013-04-12"),
        firebaseUID: "",
        role: "CHILD",
        avatar: {
          url: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=500",
          public_id: "child_avatar2",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200",
          public_id: "child_banner2",
        },
        about: "Creative gamer who loves coding and football.",
        interests: [
          { name: "Football", category: "Sports" },
          { name: "Coding", category: "STEM" },
        ],
        skills: [
          { name: "English", proficiency: "ADVANCED" },
          { name: "Math", proficiency: "INTERMEDIATE" },
        ],
      },
    ],
  },

  {
    email: "priya.kapoor@example.com",
    passwordHash: "Password@123",
    firstName: "Priya",
    lastName: "Kapoor",
    gender: "Female",
    dob: new Date("1990-04-20"),
    firebaseUID: "",
    role: "PARENT",
    isVerified: true,
    avatar: {
      url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
      public_id: "p_avatar2",
    },
    profileBanner: {
      url: "https://images.unsplash.com/photo-1522199710521-72d69614c702?w=1200",
      public_id: "p_banner2",
    },
    profileHeadline: "Teacher & Child Development Advocate",
    about:
      "Teacher and child development advocate who promotes creative learning.",
    addresses: [
      {
        street: "45 Maple Street",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        zipCode: "400001",
        isPrimary: true,
      },
    ],
    skills: [
      { name: "Child Psychology", endorsements: 15 },
      { name: "Curriculum Design", endorsements: 8 },
      { name: "Storytelling", endorsements: 20 },
    ],
    certifications: [
      {
        name: "B.Ed in Primary Education",
        issuingOrganization: "Mumbai University",
        issueDate: new Date("2014-06-10"),
      },
    ],
    experiences: [
      {
        title: "Primary Teacher",
        company: "Podar International School",
        location: "Mumbai",
        startDate: new Date("2015-06-01"),
        description: "Teaching and mentoring primary school students.",
      },
    ],
    interests: [
      { name: "Art-based Learning", category: "Education" },
      { name: "Storytelling", category: "Arts" },
    ],
    projects: [
      {
        name: "Creative Learning Club",
        description: "After-school program for creativity",
        role: "Coordinator",
        startDate: new Date("2021-07-01"),
      },
    ],
    featuredContent: {
      introHeadline: "Cultivating curiosity in every child",
      items: [
        {
          headline: "Storytelling in classrooms",
          summary: "Using narrative techniques to explain complex ideas.",
          category: "Teaching",
        },
      ],
      generatedAt: new Date(),
    },
    children: [
      // ⭐ Child 1 — Arjun
      {
        firstName: "Arjun",
        lastName: "Kapoor",
        gender: "Male",
        dob: new Date("2016-11-01"),
        firebaseUID: "",
        addresses: [
          {
            street: "45 Maple Street",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            zipCode: "400001",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500",
          public_id: "c2_1",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1200",
          public_id: "c2_1_b",
        },
        about: "Curious mind who loves storytelling and science.",
        interests: [
          { name: "Science Experiments", category: "STEM" },
          { name: "Story Writing", category: "Language" },
        ],
        skills: [
          { name: "Creative Writing", proficiency: "INTERMEDIATE" },
          { name: "Science", proficiency: "BEGINNER" },
        ],
        projects: [
          {
            name: "Solar System Model",
            description: "Handmade science model for school fair",
          },
        ],
        achievements: [
          {
            name: "Story Writing Contest Winner",
            issuer: "School",
          },
        ],
        educations: [
          {
            institution: "Podar International",
            degree: "Primary",
            startDate: new Date("2020-06-01"),
          },
        ],
        activities: [
          {
            subject: "English",
            lessonsCompleted: 8,
            avgScore: 89,
            timeSpent: 95,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },

      // ⭐ Child 2 — Riya
      {
        firstName: "Riya",
        lastName: "Kapoor",
        gender: "Female",
        dob: new Date("2014-03-10"),
        firebaseUID: "",
        addresses: [
          {
            street: "45 Maple Street",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            zipCode: "400001",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500",
          public_id: "c2_2",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200",
          public_id: "c2_2_b",
        },
        about: "Loves dance and arts and wants to teach others.",
        interests: [
          { name: "Dance", category: "Arts" },
          { name: "Painting", category: "Arts" },
        ],
        skills: [
          { name: "Dance", proficiency: "ADVANCED" },
          { name: "Painting", proficiency: "INTERMEDIATE" },
        ],
        projects: [
          {
            name: "School Dance Program",
            description: "Choreographed annual school event act",
          },
        ],
        achievements: [
          {
            name: "School Dance Medal",
            issuer: "School",
          },
        ],
        educations: [
          {
            institution: "Podar International",
            degree: "Primary",
            startDate: new Date("2019-06-01"),
          },
        ],
        activities: [
          {
            subject: "Art",
            lessonsCompleted: 6,
            avgScore: 92,
            timeSpent: 70,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },
    ],
  },

  {
    email: "michael.shah@example.com",
    passwordHash: "Password@123",
    firstName: "Michael",
    lastName: "Shah",
    gender: "Male",
    dob: new Date("1987-08-18"),
    isVerified: true,
    firebaseUID: "",
    role: "PARENT",
    avatar: {
      url: "https://images.unsplash.com/photo-1603415526960-f8f0a51a01fa?w=500",
      public_id: "p_avatar3",
    },
    profileBanner: {
      url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200",
      public_id: "p_banner3",
    },
    profileHeadline: "Data Engineer & Puzzle Enthusiast",
    about:
      "Data engineer who loves building scalable systems and encouraging logical thinking in kids.",
    addresses: [
      {
        street: "21 Paradise Lane",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        zipCode: "400002",
        isPrimary: true,
      },
    ],
    skills: [
      { name: "Python", endorsements: 18 },
      { name: "Data Engineering", endorsements: 14 },
      { name: "Problem Solving", endorsements: 20 },
    ],
    certifications: [
      {
        name: "Google Professional Data Engineer",
        issuingOrganization: "Google",
        issueDate: new Date("2021-03-01"),
      },
    ],
    experiences: [
      {
        title: "Senior Data Engineer",
        company: "TCS",
        location: "Mumbai",
        startDate: new Date("2019-09-01"),
        description: "Building and maintaining large-scale data platforms.",
      },
    ],
    interests: [
      { name: "Puzzles" },
      { name: "Chess" },
      { name: "STEM Education" },
    ],
    projects: [
      {
        name: "Learning Analytics Platform",
        description:
          "Analytics system to track and visualize student learning progress.",
        role: "Lead Data Engineer",
        startDate: new Date("2020-01-01"),
      },
    ],
    featuredContent: {
      introHeadline: "Using data and games to make learning fun",
      items: [
        {
          headline: "Logic through games",
          summary: "Designing activities that teach logic via fun puzzles.",
          category: "STEM",
        },
      ],
      generatedAt: new Date(),
    },
    children: [
      // ⭐ Child 1 — Sara
      {
        firstName: "Sara",
        lastName: "Shah",
        gender: "Female",
        dob: new Date("2012-05-15"),
        firebaseUID: "",
        addresses: [
          {
            street: "21 Paradise Lane",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            zipCode: "400002",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500",
          public_id: "child_sara",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1521302200778-33500795e128?w=1200",
          public_id: "child_sara_banner",
        },
        about: "Book lover who enjoys math challenges and brain teasers.",
        interests: [
          { name: "Reading", category: "Language" },
          { name: "Chess", category: "Mind Sports" },
        ],
        skills: [
          { name: "Math", proficiency: "ADVANCED" },
          { name: "Logical Reasoning", proficiency: "INTERMEDIATE" },
        ],
        projects: [
          {
            name: "Book Summary Journal",
            description:
              "Created a notebook system to summarize books she reads.",
          },
        ],
        certifications: [
          {
            name: "Math Olympiad Participation",
            issuer: "School",
          },
        ],
        achievements: [
          {
            name: "Top Reader Award",
            issuer: "School Library",
            issueDate: new Date("2023-12-10"),
          },
        ],
        educations: [
          {
            institution: "DPS Mumbai",
            degree: "Middle School",
            startDate: new Date("2019-06-01"),
          },
        ],
        activities: [
          {
            subject: "Math",
            lessonsCompleted: 12,
            avgScore: 93,
            timeSpent: 150,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },

      // ⭐ Child 2 — Daniel
      {
        firstName: "Daniel",
        lastName: "Shah",
        gender: "Male",
        dob: new Date("2014-09-02"),
        firebaseUID: "",
        addresses: [
          {
            street: "21 Paradise Lane",
            city: "Mumbai",
            state: "Maharashtra",
            country: "India",
            zipCode: "400002",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=500",
          public_id: "child_daniel",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=1200",
          public_id: "child_daniel_banner",
        },
        about: "Athletic and energetic, loves football and coding games.",
        interests: [
          { name: "Football", category: "Sports" },
          { name: "Minecraft", category: "Games" },
        ],
        skills: [
          { name: "Science", proficiency: "INTERMEDIATE" },
          { name: "Running", proficiency: "ADVANCED" },
        ],
        projects: [
          {
            name: "Scratch Football Game",
            description: "Built a simple football game in Scratch.",
          },
        ],
        certifications: [],
        achievements: [],
        educations: [
          {
            institution: "DPS Mumbai",
            degree: "Primary",
            startDate: new Date("2020-06-01"),
          },
        ],
        activities: [
          {
            subject: "Science",
            lessonsCompleted: 5,
            avgScore: 75,
            timeSpent: 60,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },
    ],
  },

  {
    email: "fatima.singh@example.com",
    passwordHash: "Password@123",
    firstName: "Fatima",
    lastName: "Singh",
    gender: "Female",
    dob: new Date("1991-12-05"),
    isVerified: true,
    firebaseUID: "",
    role: "PARENT",
    avatar: {
      url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500",
      public_id: "p_avatar4",
    },
    profileBanner: {
      url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200",
      public_id: "p_banner4",
    },
    profileHeadline: "Marketing Professional & Creative Parent",
    about:
      "Marketing specialist who enjoys designing creative learning experiences and weekend art projects with her kids.",
    addresses: [
      {
        street: "A Wing Street",
        city: "Delhi",
        state: "Delhi",
        country: "India",
        zipCode: "110001",
        isPrimary: true,
      },
    ],
    skills: [
      { name: "Digital Marketing", endorsements: 10 },
      { name: "Content Strategy", endorsements: 7 },
      { name: "Communication", endorsements: 15 },
    ],
    certifications: [
      {
        name: "Digital Marketing Certification",
        issuingOrganization: "Google",
        issueDate: new Date("2019-09-15"),
      },
    ],
    experiences: [
      {
        title: "Marketing Manager",
        company: "CreativeAds Pvt Ltd",
        location: "Delhi",
        startDate: new Date("2018-04-01"),
        description: "Managing digital campaigns and content initiatives.",
      },
    ],
    interests: [
      { name: "Parenting Blogs" },
      { name: "DIY Crafts" },
      { name: "Storybooks for Kids" },
    ],
    projects: [
      {
        name: "Weekend Art Club",
        description: "Organizes weekly art and craft activities for children.",
        role: "Organizer",
        startDate: new Date("2022-01-10"),
      },
    ],
    featuredContent: {
      introHeadline: "Bringing creativity into everyday parenting",
      items: [
        {
          headline: "Crafting weekends",
          summary: "Fun DIY projects to build creativity and bonding.",
          category: "Parenting",
        },
      ],
      generatedAt: new Date(),
    },
    children: [
      // ⭐ Child 1 — Zoya
      {
        firstName: "Zoya",
        lastName: "Singh",
        gender: "Female",
        dob: new Date("2018-02-20"),
        firebaseUID: "",
        addresses: [
          {
            street: "A Wing Street",
            city: "Delhi",
            state: "Delhi",
            country: "India",
            zipCode: "110001",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1591738298452-1c87fb4d1934?w=500",
          public_id: "child_zoya",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200",
          public_id: "child_zoya_banner",
        },
        about: "Very playful and loves arts, colors and bedtime stories.",
        interests: [
          { name: "Coloring", category: "Arts" },
          { name: "Fairy Tales", category: "Reading" },
        ],
        skills: [
          { name: "Drawing", proficiency: "BEGINNER" },
          { name: "Story Listening", proficiency: "INTERMEDIATE" },
        ],
        projects: [
          {
            name: "Colorful Nature Book",
            description:
              "Made a scrapbook with drawings of trees, animals and flowers.",
          },
        ],
        certifications: [],
        achievements: [
          {
            name: "Best Coloring Star",
            issuer: "Pre-school",
            issueDate: new Date("2023-11-10"),
          },
        ],
        educations: [
          {
            institution: "Sunrise Pre-School",
            degree: "Pre-Primary",
            startDate: new Date("2022-06-01"),
          },
        ],
        activities: [
          {
            subject: "Art",
            lessonsCompleted: 5,
            avgScore: 88,
            timeSpent: 60,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },

      // ⭐ Child 2 — Kabir
      {
        firstName: "Kabir",
        lastName: "Singh",
        gender: "Male",
        dob: new Date("2016-01-10"),
        firebaseUID: "",
        addresses: [
          {
            street: "A Wing Street",
            city: "Delhi",
            state: "Delhi",
            country: "India",
            zipCode: "110001",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500",
          public_id: "child_kabir",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=1200",
          public_id: "child_kabir_banner",
        },
        about: "Quick learner who likes outdoor activities and numbers.",
        interests: [
          { name: "Cricket", category: "Sports" },
          { name: "Cycling", category: "Outdoor" },
        ],
        skills: [
          { name: "Math", proficiency: "INTERMEDIATE" },
          { name: "Teamwork", proficiency: "INTERMEDIATE" },
        ],
        projects: [
          {
            name: "Neighborhood Cricket Club",
            description:
              "Helped organize friendly matches with kids in the colony.",
          },
        ],
        certifications: [],
        achievements: [
          {
            name: "Sports Day 100m Race",
            issuer: "School",
            issueDate: new Date("2023-01-26"),
          },
        ],
        educations: [
          {
            institution: "City Elementary School",
            degree: "Primary",
            startDate: new Date("2021-06-01"),
          },
        ],
        activities: [
          {
            subject: "Math",
            lessonsCompleted: 7,
            avgScore: 81,
            timeSpent: 90,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },
    ],
  },

  {
    email: "rohan.mehra@example.com",
    passwordHash: "Password@123",
    firstName: "Rohan",
    lastName: "Mehra",
    gender: "Male",
    dob: new Date("1988-02-25"),
    isVerified: true,
    firebaseUID: "",
    role: "PARENT",
    avatar: {
      url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500",
      public_id: "p_avatar5",
    },
    profileBanner: {
      url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200",
      public_id: "p_banner5",
    },
    profileHeadline: "Product Manager & Engaged Parent",
    about:
      "Product manager who loves building meaningful products and supporting his kids' curiosity and learning.",
    addresses: [
      {
        street: "Gulmohar Road",
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        zipCode: "411001",
        isPrimary: true,
      },
    ],
    skills: [
      { name: "Product Strategy", endorsements: 13 },
      { name: "User Research", endorsements: 9 },
      { name: "Roadmapping", endorsements: 7 },
    ],
    certifications: [
      {
        name: "Certified Scrum Product Owner",
        issuingOrganization: "Scrum Alliance",
        issueDate: new Date("2020-02-15"),
      },
    ],
    experiences: [
      {
        title: "Senior Product Manager",
        company: "EduTech Labs",
        location: "Pune",
        startDate: new Date("2019-03-01"),
        description: "Leading product development for learning applications.",
      },
    ],
    interests: [
      { name: "Ed-tech" },
      { name: "Reading" },
      { name: "Parent-Child Activities" },
    ],
    projects: [
      {
        name: "Learning Companion App",
        description:
          "A mobile app concept to help parents track and guide their children's learning journeys.",
        role: "Product Owner",
        startDate: new Date("2022-06-01"),
      },
    ],
    featuredContent: {
      introHeadline: "Designing better learning journeys for kids and parents",
      items: [
        {
          headline: "Building engaging experiences",
          summary:
            "Exploring how simple design choices can keep kids motivated to learn.",
          category: "Product",
        },
      ],
      generatedAt: new Date(),
    },
    children: [
      {
        firstName: "Ananya",
        lastName: "Mehra",
        gender: "Female",
        dob: new Date("2013-08-09"),
        firebaseUID: "",
        role: "CHILD",
        addresses: [
          {
            street: "Gulmohar Road",
            city: "Pune",
            state: "Maharashtra",
            country: "India",
            zipCode: "411001",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
          public_id: "child_ananya",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
          public_id: "child_ananya_banner",
        },
        about:
          "Curious learner who enjoys writing, science and exploring new ideas.",
        interests: [
          { name: "Creative Writing", category: "Language" },
          { name: "Science Experiments", category: "STEM" },
        ],
        skills: [
          { name: "English", proficiency: "INTERMEDIATE" },
          { name: "Presentation", proficiency: "BEGINNER" },
        ],
        projects: [
          {
            name: "Short Story Collection",
            description: "Wrote a set of short stories about school life.",
          },
        ],
        certifications: [],
        achievements: [
          {
            name: "Essay Writing Competition - Runner Up",
            issuer: "School",
            issueDate: new Date("2023-08-15"),
          },
        ],
        educations: [
          {
            institution: "Pune Public School",
            degree: "Middle School",
            startDate: new Date("2019-06-01"),
          },
        ],
        activities: [
          {
            subject: "English",
            lessonsCompleted: 9,
            avgScore: 88,
            timeSpent: 110,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },

      {
        firstName: "Aarav",
        lastName: "Mehra",
        gender: "Male",
        dob: new Date("2015-05-22"),
        firebaseUID: "",
        role: "CHILD",
        addresses: [
          {
            street: "Gulmohar Road",
            city: "Pune",
            state: "Maharashtra",
            country: "India",
            zipCode: "411001",
            isPrimary: true,
          },
        ],
        avatar: {
          url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
          public_id: "child_aarav",
        },
        profileBanner: {
          url: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=1200",
          public_id: "child_aarav_banner",
        },
        about: "Loves animals, drawing, and trying out new games.",
        interests: [
          { name: "Animals", category: "Nature" },
          { name: "Drawing", category: "Art" },
        ],
        skills: [
          { name: "Drawing", proficiency: "BEGINNER" },
          { name: "Observation", proficiency: "INTERMEDIATE" },
        ],
        projects: [
          {
            name: "Animal Facts Scrapbook",
            description:
              "Created a scrapbook with facts and drawings of animals.",
          },
        ],
        certifications: [],
        achievements: [],
        educations: [
          {
            institution: "Pune Public School",
            degree: "Primary",
            startDate: new Date("2021-06-01"),
          },
        ],
        activities: [
          {
            subject: "Art",
            lessonsCompleted: 4,
            avgScore: 86,
            timeSpent: 50,
          },
        ],
        permissions: {
          canAddAvatar: true,
          canUpdateAvatar: true,
          canAddProfileBanner: true,
        },
      },
    ],
  },
];
