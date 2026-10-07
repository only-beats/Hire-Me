// ============ TRAIN YOUR AI HERE ============
// Each item = questions people might ask (q) + the answer you want (a).
// The AI understands MEANING, so q only needs a few examples, not every wording.
// It will ONLY answer from this list. Anything else gets the "unknown" reply.
//
// Want your REAL voice? Record the answer on your phone, save it as an mp3 in the
// "answers" folder, and set audio: 'answers/intro.mp3'. Leave audio '' to use the browser voice.
// Items marked DRAFT are starter text. Rewrite them in your own words before sharing.
window.BRAIN = {
  threshold: 0.42, // higher = stricter matching (0.35 to 0.55 is a good range)

  greeting: { a: "Hi, I'm Dhananjay's AI. Ask me anything about my projects, skills or education, just like in an interview.", audio: '' },

  unknown: { a: "I haven't been trained on that one yet. Please email me and I'll answer you personally.", audio: '' },

  items: [
    { q: ['tell me about yourself', 'introduce yourself', 'who are you', 'give me a short introduction'],
      a: "I'm Dhananjay, a final-year computer science student. I like building small web apps that people can actually use, like a chess report site and an offline music player. Right now I'm looking for my first software engineer role.",
      audio: '' },

    { q: ['why should we hire you', 'what makes you a good candidate', 'why are you the right person for this job'],
      a: "I finish what I start and I learn fast. Chesscope and Only-Beats are both live and I built them on my own. I'd bring that same habit to your team.", // DRAFT
      audio: '' },

    { q: ['what are your strengths', 'what are you best at', 'what is your strongest skill'],
      a: "Building web apps from idea to a live link. I can design the screen, write the JavaScript and Node.js side, and put it online.", // DRAFT
      audio: '' },

    { q: ['what are your weaknesses', 'what do you want to improve', 'what are you still learning'],
      a: "I'm still learning how to design bigger systems. I work on it by building complete projects and reading how other developers structure theirs.", // DRAFT
      audio: '' },

    { q: ['what projects have you built', 'show me your work', 'tell me about your projects'],
      a: "Three main ones. Chesscope gives Stockfish reports for chess games. Only-Beats is a music player you can install like an app. And Living Sticker is a cartoon whose eyes follow you, the same idea as this page.",
      audio: '' },

    { q: ['tell me about chesscope', 'what is chesscope', 'chess project', 'how does the chess analysis work'],
      a: "Chesscope runs the Stockfish chess engine on your games and gives a clear move by move report, so you can see why a move was bad. It's built with JavaScript and Node.js.",
      audio: '' },

    { q: ['tell me about only beats', 'what is only beats', 'music player project'],
      a: "Only-Beats is a mobile first music player web app with folders and song lists for each folder. It installs like an app on your phone and runs on GitHub Pages.",
      audio: '' },

    { q: ['tell me about living sticker', 'how do the eyes follow the cursor', 'how did you build this portfolio'],
      a: "Living Sticker is a cartoon whose eyes follow your mouse on a laptop, or a joystick on a phone. I reused the same idea in this portfolio, and added a voice so you can talk to me.",
      audio: '' },

    { q: ['what technical skills do you have', 'which programming languages do you know', 'what is your tech stack'],
      a: "Languages: C, C plus plus, Java, Python, JavaScript and S Q L. For the web: HTML, CSS, React and Node J S. I also know data structures, algorithms, operating systems and databases, and I use Git and Linux daily.",
      audio: '' },

    { q: ['tell me about your education', 'where do you study', 'what is your degree', 'what are your marks'],
      a: "I'm doing my B E in Computer Science at B R Harne college, Mumbai University. Before that I did a diploma in 2024 and passed with distinction, with seventy two point two three percent.",
      audio: '' },

    { q: ['do you have any certifications', 'what courses have you done', 'any achievements'],
      a: "I have certificates in Programming in C plus plus and in Data Analytics.",
      audio: '' },

    { q: ['are you available', 'are you looking for a job', 'can you join us', 'are you open to internships'],
      a: "Yes. I'm open to internships and full time roles as a software engineer, starting after graduation.",
      audio: '' },

    { q: ['where do you see yourself in five years', 'what are your career goals'],
      a: "In five years I want to be a strong software engineer who owns features end to end and helps newer developers grow.", // DRAFT
      audio: '' },

    { q: ['why do you want to work with us', 'what do you want in your first job'],
      a: "I want a team where I can learn from experienced engineers and ship real features quickly.", // DRAFT
      audio: '' },

    { q: ['how can I contact you', 'what is your email', 'how do I reach you', 'where can I find you online'],
      a: "The fastest way is email, you'll find the button at the bottom of this page. My GitHub and LinkedIn are there too.",
      audio: '' },

    { q: ['can I see your resume', 'send me your cv', 'download resume'],
      a: "Yes, there's a download resume button at the top of this page.",
      audio: '' },

    { q: ['hello', 'hi there', 'how are you', 'good morning'],
      a: "Hello! Nice to meet you. Ask me about my projects, skills or education.",
      audio: '' }
  ]
};
