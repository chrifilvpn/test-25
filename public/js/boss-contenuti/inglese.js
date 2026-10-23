// DISPENSE — Inglese: gli argomenti, ognuno con la sua pagina (usa gli aiuti di boss-pagina.js: nota, ide, terminale, figura…).
(() => {
  const { nota, ide, terminale, figura, tabella } = window.BossAiuti;
  void ide; void terminale; void figura; void tabella;
  window.BossContenuti = window.BossContenuti || {};
  window.BossContenuti.inglese = {
    id: 'inglese', nome: 'Inglese',
    argomenti: [
      { id: 'cloud', titolo: 'Cloud computing and data centres', minuti: 9, giorni: -26, corpo: () => `
        <p class="st-intro"><b>Cloud computing</b> is the delivery of computing services — servers, storage, databases, networking and software — over the Internet. Instead of buying and maintaining their own machines, companies <i>rent</i> resources from a provider and pay only for what they use.</p>
        <h2 id="st-s1">1. Key vocabulary</h2>
        <div class="st-tabella"><table><thead><tr><th>English</th><th>Meaning</th><th>Italiano</th></tr></thead><tbody>
          <tr><td><b>on-premises</b></td><td>hardware kept in the company's own building</td><td>in sede</td></tr>
          <tr><td><b>scalability</b></td><td>the ability to add or remove resources quickly</td><td>scalabilità</td></tr>
          <tr><td><b>downtime</b></td><td>the time when a service is not available</td><td>tempo di inattività</td></tr>
          <tr><td><b>backup</b></td><td>a copy of data kept in a safe place</td><td>copia di sicurezza</td></tr>
          <tr><td><b>latency</b></td><td>the delay before data starts to arrive</td><td>latenza</td></tr>
          <tr><td><b>provider</b></td><td>the company that sells the service</td><td>fornitore</td></tr></tbody></table></div>
        <h2 id="st-s2">2. Service models: IaaS, PaaS and SaaS</h2>
        <p>With <b>IaaS</b> (Infrastructure as a Service) you rent virtual machines, storage and networks, and you manage the operating system yourself. With <b>PaaS</b> (Platform as a Service) the provider also manages the operating system and the runtime: developers only upload their code. With <b>SaaS</b> (Software as a Service) you simply use a finished application in the browser, like webmail or an online office suite.</p>
        ${nota('info', 'Remember', 'The higher you go (IaaS → PaaS → SaaS), the less you manage and the less control you have.')}
        <h2 id="st-s3">3. Inside a data centre</h2>
        <p>A data centre is a building full of <b>racks</b> of servers. It needs a reliable power supply (with <b>UPS</b> units and generators), a cooling system, fast network links and strong physical security. Providers build data centres in different <b>regions</b>, so that a service can keep working even if one site goes offline.</p>
        <h2 id="st-s4">4. Advantages and disadvantages</h2>
        <p>The main <b>advantages</b> are lower initial costs, scalability, automatic updates and access from anywhere. The main <b>disadvantages</b> are the need for a stable Internet connection, less control over where the data is stored, and the risk of depending on a single provider (<i>vendor lock-in</i>).</p>
        <h2 id="st-s5">Exercises</h2>
        <ol class="st-esercizi">
          <li>Match each service to its model (IaaS, PaaS or SaaS): an online spreadsheet, a virtual server with Linux, a platform where you deploy a web app.</li>
          <li>Write 80–100 words: "Should our school move its files to the cloud?" Give two advantages and one disadvantage.</li>
          <li>Translate into English: «Il fornitore garantisce un tempo di inattività inferiore a un'ora all'anno».</li>
        </ol>` },
      { id: 'grammar', titolo: 'Present perfect vs past simple · Conditionals', minuti: 12, giorni: -19, corpo: () => `
        <p class="st-intro">Two topics for this unit: when to use the <b>present perfect</b> and when the <b>past simple</b>, and how to build <b>conditional sentences</b>. Both are essential in technical English, for example when you describe what a program <i>has done</i> or what <i>will happen if</i> a user clicks a button.</p>
        <h2 id="st-s1">1. Present perfect</h2>
        <p>Form: <b>have / has + past participle</b>. We use it for actions that happened at an unspecified time before now, or that started in the past and continue now. Typical words: <i>ever, never, already, yet, just, since, for</i>.</p>
        <div class="st-tabella"><table><thead><tr><th>Affirmative</th><th>Negative</th><th>Question</th></tr></thead><tbody>
          <tr><td>I have installed the update.</td><td>I haven't installed it yet.</td><td>Have you installed it?</td></tr>
          <tr><td>She has worked here since 2020.</td><td>She hasn't worked here for long.</td><td>How long has she worked here?</td></tr></tbody></table></div>
        <h2 id="st-s2">2. Past simple</h2>
        <p>Form: <b>verb + -ed</b> (regular) or the second column of irregular verbs (<i>go → went, write → wrote</i>). We use it for finished actions at a <b>specific time</b> in the past. Typical words: <i>yesterday, last week, in 2019, two days ago</i>.</p>
        ${nota('info', 'Present perfect or past simple?', 'If you say WHEN, use the past simple: «I fixed the bug yesterday». If the time is not important or not finished, use the present perfect: «I have fixed the bug» (it works now).')}
        <h2 id="st-s3">3. Conditionals</h2>
        <div class="st-tabella"><table><thead><tr><th>Type</th><th>Form</th><th>Use</th><th>Example</th></tr></thead><tbody>
          <tr><td><b>Zero</b></td><td>if + present, present</td><td>facts, things always true</td><td>If you heat water to 100 °C, it boils.</td></tr>
          <tr><td><b>First</b></td><td>if + present, will + verb</td><td>real, possible future</td><td>If the server crashes, we will lose the data.</td></tr>
          <tr><td><b>Second</b></td><td>if + past simple, would + verb</td><td>imaginary or unlikely situations</td><td>If I had more RAM, the game would run faster.</td></tr></tbody></table></div>
        ${nota('avviso', 'Common mistake', 'Never put «will» or «would» after «if»: ✗ If it will rain… → ✓ If it rains… In the second conditional we often say «If I were you» for all persons.')}
        <h2 id="st-s4">Exercises</h2>
        <ol class="st-esercizi">
          <li>Put the verbs in the present perfect or past simple: «I (write) the report last night, but I (not send) it yet».</li>
          <li>Complete with the first conditional: «If you (click) this link, the browser (open) a new tab».</li>
          <li>Write three second-conditional sentences starting with «If I were a programmer…».</li>
          <li>Find and correct the mistake: «If the battery will be low, the laptop turns off».</li>
        </ol>` },
      { id: 'networks', titolo: 'Computer networks: key vocabulary', minuti: 8, giorni: -12, corpo: () => `
        <p class="st-intro">This unit reviews the <b>vocabulary of computer networks</b> that you need to read technical documentation and describe a network in English.</p>
        <h2 id="st-s1">1. Types of network</h2>
        ${tabella(['Term', 'Meaning'], [['LAN', 'Local Area Network: a network in a building, for example a school'], ['WAN', 'Wide Area Network: it connects networks over long distances'], ['WLAN', 'Wireless LAN, usually Wi-Fi'], ['VPN', 'Virtual Private Network: a secure tunnel over the Internet']])}
        <h2 id="st-s2">2. Devices</h2>
        <ul><li>A <b>router</b> forwards packets between different networks.</li><li>A <b>switch</b> connects devices in the same LAN and forwards frames using MAC addresses.</li><li>An <b>access point</b> lets wireless devices join the network.</li><li>A <b>firewall</b> filters traffic according to a set of rules.</li></ul>
        <h2 id="st-s3">3. Useful phrases</h2>
        <ul><li>«The server <b>is connected to</b> the switch <b>via</b> a Gigabit Ethernet cable.»</li><li>«Each device <b>is assigned</b> an IP address <b>by</b> the DHCP server.» (passive voice)</li><li>«If the router fails, the whole network <b>goes down</b>.»</li></ul>
        ${nota('info', 'False friends', '«Actually» means «in realtà», not «attualmente» (= currently); «to install» and «to set up» are both common for software and devices.')}` },
      { id: 'security', titolo: 'Cybersecurity: threats and good practice', minuti: 9, giorni: -5, corpo: () => `
        <p class="st-intro"><b>Cybersecurity</b> is the practice of protecting systems, networks and data from digital attacks. This unit presents the main threats and some good habits.</p>
        <h2 id="st-s1">1. Common threats</h2>
        ${tabella(['Threat', 'Description'], [['Malware', 'malicious software, such as viruses, worms and trojans'], ['Ransomware', 'it encrypts your files and asks for a ransom'], ['Phishing', 'fake emails or websites that steal passwords'], ['DDoS attack', 'many computers flood a server so that it stops working']])}
        <h2 id="st-s2">2. Good practice</h2>
        <ul><li>Use <b>strong, unique passwords</b> and a password manager.</li><li>Turn on <b>two-factor authentication</b> (2FA).</li><li><b>Update</b> your operating system and apps regularly.</li><li>Make <b>backups</b> and keep one copy offline.</li></ul>
        <h2 id="st-s3">3. Modal verbs for advice</h2>
        <p>We use <b>should</b> and <b>must</b> to give advice and rules: «You <b>should</b> change your password every few months.» «Employees <b>must not</b> share their credentials.»</p>
        ${nota('avviso', 'Reading tip', 'In security texts, «to breach» means to break into a system; a «data breach» is an incident in which data are stolen.')}` },
      { id: 'ai', titolo: 'Artificial intelligence and machine learning', minuti: 12, giorni: -4, corpo: () => `
        <p class="st-intro"><b>Artificial intelligence</b> (AI) is the field of computer science that builds systems able to perform tasks that normally require human intelligence: recognising images and speech, translating languages, making decisions, writing text. Most of today's AI is based on <b>machine learning</b>: instead of following rules written by a programmer, the system <i>learns</i> from examples.</p>
        <h2 id="st-s1">1. Key vocabulary</h2>
        ${tabella(["English", "Meaning", "Italiano"], [
          ["<b>dataset</b>", "a collection of examples used to train or test a model", "insieme di dati"],
          ["<b>to train</b> a model", "to let the system learn from the data", "addestrare"],
          ["<b>feature</b>", "a measurable property used as input", "caratteristica"],
          ["<b>label</b>", "the correct answer attached to an example", "etichetta"],
          ["<b>accuracy</b>", "the percentage of correct predictions", "accuratezza"],
          ["<b>bias</b>", "a systematic error that makes results unfair", "distorsione, pregiudizio"],
          ["<b>neural network</b>", "a model made of layers of connected artificial neurons", "rete neurale"],
          ["<b>chatbot</b>", "a program that talks with users in natural language", "assistente conversazionale"],
        ])}
        <h2 id="st-s2">2. Reading: how does a machine learn?</h2>
        <p>Imagine we want a program that recognises spam emails. A traditional programmer would write rules: <i>if the subject contains "FREE MONEY", then it is spam</i>. But spammers change their words every day, and the rules soon become useless.</p>
        <p>With machine learning, we collect thousands of emails that people have already <b>labelled</b> as "spam" or "not spam". The algorithm analyses the <b>features</b> of each email — words, links, sender — and builds a <b>model</b> that finds the patterns by itself. Then we test the model on emails it has <b>never seen before</b>: if it classifies them correctly, it can be used in the real world. The model can also be <b>retrained</b> regularly with new examples, so it keeps up with the spammers.</p>
        ${tabella(["Type of learning", "How it works", "Example"], [
          ["Supervised learning", "the model learns from labelled examples", "spam filters, recognising handwritten numbers"],
          ["Unsupervised learning", "the model finds groups in data without labels", "dividing customers into groups with similar habits"],
          ["Reinforcement learning", "the model learns by trial and error, receiving rewards", "a robot learning to walk, a program playing chess"],
        ])}
        ${nota("info", "Deep learning and generative AI", "<b>Deep learning</b> uses neural networks with many layers. It is behind image recognition, voice assistants and <b>generative AI</b>: large language models that produce text, code or images from a <i>prompt</i>. These models predict the most probable next word, so they can sound very confident even when they are wrong. These mistakes are called <b>hallucinations</b>.")}
        <h2 id="st-s3">3. Benefits and risks</h2>
        <p>AI <b>can</b> help doctors read medical scans, reduce energy consumption in buildings and make technology more accessible to people with disabilities. However, it <b>may</b> also cause problems: a model trained on biased data <b>might</b> discriminate against some groups of people; automatic systems <b>could</b> replace some jobs; deepfakes <b>can</b> spread false information. For these reasons the European Union has approved the <b>AI Act</b>, which classifies AI systems by level of risk and bans the most dangerous uses.</p>
        <h2 id="st-s4">4. Language focus: modal verbs of possibility</h2>
        ${tabella(["Modal", "Use", "Example"], [["can", "general possibility, ability", "AI can translate a text in seconds."], ["could", "possibility in the future, less certain", "AI could change the job market."], ["may", "possibility, rather formal", "The results may contain errors."], ["might", "weak possibility", "The model might be biased."], ["will / won't", "prediction", "Robots won't replace all teachers."]])}
        ${nota("avviso", "Remember", "After a modal verb we use the base form without «to»: «AI <b>can help</b>», not «AI can to help» or «AI can helps».")}
        <h2 id="st-s5">Exercises</h2>
        <ol class="st-esercizi">
          <li>Explain in your own words the difference between a traditional program and a machine learning model (60–80 words).</li>
          <li>Write five predictions about AI in 2040 using <i>will, may, might, could</i> and <i>won't</i>.</li>
          <li>Discuss in pairs: «Should students be allowed to use AI tools to do their homework?» Give two reasons for and two against.</li>
        </ol>` },
      { id: 'cv', titolo: 'Writing a CV and a cover letter', minuti: 14, giorni: -2, corpo: () => `
        <p class="st-intro">At the end of the school year many of you will apply for a job, an internship or a university course, sometimes abroad. You will need two documents in English: a <b>CV</b> (curriculum vitae, called a <i>résumé</i> in the USA) and a <b>cover letter</b>. This unit shows how to write them, with a complete example.</p>
        <h2 id="st-s1">1. The structure of a CV</h2>
        <ul><li><b>Personal details</b>: name, phone number, email, city, a link to your online portfolio or code repository. A photo, date of birth and marital status are not necessary (in the UK and the USA they are usually left out).</li>
          <li><b>Profile</b>: two or three lines that describe who you are and what you are looking for.</li>
          <li><b>Education</b> and <b>work experience</b>: in <b>reverse chronological order</b> (the most recent first), with dates, place and what you did.</li>
          <li><b>Skills</b>: technical skills, languages (with the CEFR level, for example B2), soft skills.</li>
          <li><b>Projects</b>, certifications, interests: only if relevant.</li></ul>
        ${nota("info", "Tips", "Keep it short: <b>one page</b> is perfect for a student. Use <b>action verbs</b> in the past simple (<i>developed, designed, configured, managed, tested</i>) and give concrete results (<i>«reduced loading time by half»</i>). Check spelling twice and save it as a PDF.")}
        <h2 id="st-s2">2. Example of a CV</h2>
        <div class="st-documento">
          <h3>Luca Ferri</h3>
          <p class="st-doc-sotto">Junior Web Developer · Bologna, Italy · +39 333 000 0000 · luca.ferri@example.com · portfolio: lucaferri.example.com</p>
          <h4>Profile</h4>
          <p>Motivated computer science student with practical experience in web development and networking. Looking for an internship as a junior developer where I can improve my skills in a professional team.</p>
          <h4>Education</h4>
          <p><b>Technical Diploma in Computer Science and Telecommunications</b> — Technical Institute, Bologna (2021 – present)<br>Main subjects: programming (Java, PHP, JavaScript), databases (SQL), networks, cybersecurity.</p>
          <h4>Work experience</h4>
          <p><b>Intern, IT department</b> — a local software company, Bologna (June – July, 160 hours)<br>• Developed a web page to display data from a REST API.<br>• Tested and fixed bugs in a PHP application.<br>• Helped colleagues configure laptops and the office Wi-Fi.</p>
          <h4>Skills</h4>
          <p><b>Technical</b>: HTML, CSS, JavaScript, Java, PHP, MySQL, Git, Linux, basic network configuration.<br><b>Languages</b>: Italian (native), English (B2), Spanish (A2).<br><b>Soft skills</b>: teamwork, problem solving, time management.</p>
          <h4>Projects</h4>
          <p><b>School weather station</b>: sensors connected via MQTT and a web dashboard (team of 4, I was responsible for the database and the API).</p>
        </div>
        <h2 id="st-s3">3. The cover letter</h2>
        <p>The cover letter accompanies the CV. It is not a copy of the CV: it explains <b>why</b> you want <b>this</b> job and why you are the right person. It should be about <b>250–350 words</b>, in a formal register, divided into paragraphs:</p>
        <ol><li><b>Opening</b>: the position you are applying for and how you found it.</li><li><b>Body</b>: your most relevant skills and experiences, with one or two examples.</li><li><b>Motivation</b>: why this company interests you.</li><li><b>Closing</b>: your availability for an interview and a polite greeting.</li></ol>
        <div class="st-documento">
          <p>Dear Ms Taylor,</p>
          <p>I am writing to apply for the position of <b>Junior Web Developer intern</b>, which I saw advertised on your website. I am a final-year student of Computer Science at a technical institute in Bologna, and I will finish my studies in June.</p>
          <p>During my studies I have developed a solid knowledge of HTML, CSS, JavaScript and PHP, and I have worked with MySQL databases. Last summer I completed a 160-hour internship in a software company, where I built a web page that displays data from a REST API and helped to test a PHP application. I have also worked in a team of four on a school weather station, where I was responsible for the database and the API.</p>
          <p>I am particularly interested in your company because of your projects for schools and public libraries, and I would like to contribute to software that is useful to many people. I am a quick learner, I enjoy working in a team and I am used to meeting deadlines.</p>
          <p>I have attached my CV for your consideration. I would welcome the opportunity to discuss my application in an interview. Thank you for your time.</p>
          <p>Yours sincerely,<br>Luca Ferri</p>
        </div>
        <h2 id="st-s4">4. Useful phrases and formal register</h2>
        ${tabella(["Purpose", "Phrase"], [
          ["Starting", "I am writing to apply for the position of… / I am writing in response to your advertisement for…"],
          ["Talking about experience", "I have experience in… / During my internship I was responsible for…"],
          ["Talking about skills", "I am proficient in… / I have a good knowledge of… / I am able to…"],
          ["Motivation", "I am particularly interested in… because…"],
          ["Closing", "I look forward to hearing from you. / I would welcome the opportunity to…"],
        ])}
        ${nota("avviso", "Greetings", "If you know the name of the person, start with <b>Dear Ms / Mr + surname</b> and end with <b>Yours sincerely</b>. If you do not know it, start with <b>Dear Sir or Madam</b> (or <i>Dear Hiring Manager</i>) and end with <b>Yours faithfully</b> (British English). In a formal letter avoid contractions: write <i>I am</i>, not <i>I'm</i>.")}
        <h2 id="st-s5">Exercises</h2>
        <ol class="st-esercizi">
          <li>Write your own CV in English following the example. Keep it to one page.</li>
          <li>Find a job or internship advertisement for an IT position and write a cover letter of about 250 words.</li>
          <li>Rewrite these sentences in a formal register: «I'm good at Java», «Hope to hear from you soon», «I wanna work with you».</li>
        </ol>` },
      { id: 'iot', titolo: 'The Internet of Things', minuti: 11, giorni: -1, corpo: () => `
        <p class="st-intro">The <b>Internet of Things</b> (IoT) is the network of physical objects — "things" — that contain sensors, software and a network connection, so that they can collect data and exchange it with other devices and systems over the Internet. Experts estimate that there are already tens of billions of connected devices in the world.</p>
        <h2 id="st-s1">1. Key vocabulary</h2>
        ${tabella(["English", "Meaning", "Italiano"], [
          ["<b>sensor</b>", "a device that measures something (temperature, light, movement)", "sensore"],
          ["<b>actuator</b>", "a device that performs an action (opens a valve, turns on a motor)", "attuatore"],
          ["<b>smart</b> device", "an object that is connected and can process data", "dispositivo intelligente"],
          ["<b>wearable</b>", "a device you wear, like a smartwatch or a fitness band", "dispositivo indossabile"],
          ["<b>gateway</b>", "a device that connects local sensors to the Internet", "gateway, ponte"],
          ["<b>real-time</b>", "happening immediately, with no delay", "in tempo reale"],
          ["<b>firmware</b>", "the software stored inside a device", "firmware"],
        ])}
        <h2 id="st-s2">2. Reading: a day in a smart city</h2>
        <p>It is 7 a.m. in a smart city. Sensors under the road <b>count</b> the cars and send the data to a control centre, which <b>adjusts</b> the traffic lights to reduce queues. At the bus stop, a display shows that the next bus <b>will arrive</b> in four minutes: the bus is sending its GPS position every few seconds. In the park, the sprinklers <b>are switched on</b> only when the soil sensors detect that the ground is dry. Smart bins <b>send</b> a message when they are full, so the rubbish trucks <b>are sent</b> only where they are needed.</p>
        <p>At home, a smart thermostat has learnt the family's habits and turns on the heating half an hour before they come back. In the hospital, patients wear sensors that monitor their heart rate and alert the nurses if something goes wrong. In the countryside, farmers use <b>smart agriculture</b>: drones and sensors tell them exactly where to water and fertilise, saving water and money.</p>
        <h2 id="st-s3">3. How it works</h2>
        <p>A typical IoT system has four parts: the <b>devices</b> with sensors and actuators; the <b>connectivity</b> (Wi-Fi, Bluetooth, mobile networks, or low-power networks such as LoRaWAN); the <b>data processing</b>, in the cloud or close to the devices (<i>edge computing</i>); and the <b>user interface</b>, such as an app or a dashboard. Devices often communicate with a lightweight protocol called <b>MQTT</b>, based on the <i>publish/subscribe</i> model.</p>
        <h2 id="st-s4">4. Security and privacy</h2>
        <p>Many IoT devices are cheap and are sold with <b>default passwords</b> that users never change. Some never <b>receive</b> security updates. Attackers can take control of thousands of these devices and use them as a <b>botnet</b> to attack websites. In addition, smart devices collect a lot of personal data: a smart speaker hears our conversations, a smart meter knows when we are at home.</p>
        ${nota("info", "Good practice", "Change the default password, update the firmware, put IoT devices on a separate network, and check what data the device collects and where it is sent.")}
        <h2 id="st-s5">5. Language focus: the passive voice</h2>
        <p>Technical texts often use the <b>passive</b>, because what happens is more important than who does it. Form: <b>be + past participle</b>.</p>
        ${tabella(["Tense", "Active", "Passive"], [["Present simple", "The sensor <b>measures</b> the temperature.", "The temperature <b>is measured</b> by the sensor."], ["Past simple", "Engineers <b>installed</b> the sensors in 2023.", "The sensors <b>were installed</b> in 2023."], ["Present perfect", "Someone <b>has hacked</b> the camera.", "The camera <b>has been hacked</b>."], ["Modal", "You <b>can control</b> the lights with an app.", "The lights <b>can be controlled</b> with an app."]])}
        <h2 id="st-s6">Exercises</h2>
        <ol class="st-esercizi">
          <li>Find in the reading all the verbs in the passive form and say which tense they are in.</li>
          <li>Describe a smart device you use (or would like to have): what it does, what data it collects, one advantage and one risk (80–100 words).</li>
          <li>Turn into the passive: «The app sends a notification», «The company updated the firmware», «Hackers can steal the data».</li>
        </ol>` },
    ],
  };
})();
