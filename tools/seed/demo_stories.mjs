// Demo stories added 2026-10-13: one story per category at every reading level (picsum placeholder art, all free).
// Usage: node tools/seed/demo_stories.mjs [from] [to]   -> prints SQL (DO blocks, idempotent by slug) for stories from..to.
// Investigation was renamed Discovery & Science on 2026-10-13; the last 8 stories were added then.
// Existing demo stories (2026-10-11/12) already covered Adventure and Nature at all levels, Character & Growth and Emotional/Investigation in part.
const S = 'sunrise', P = 'spark', K = 'seeker';
export const stories = [
  // ---------- Sunrise ----------
  { slug: 'two-friends-one-umbrella', title: 'Two Friends, One Umbrella', level: S, cats: ['family-friendship'], min: 2,
    synopsis: 'It is raining, and Ada has the only umbrella. What will she do?',
    pages: ['Rain, rain, rain! Ada has a big red umbrella.', 'Tayo has no umbrella. His hat is wet. His shoes are wet.', '“Come under,” says Ada. Tayo steps in. Pitter, patter, pitter, patter.', 'Two friends, one umbrella. They walk and laugh all the way home.'] },
  { slug: 'dayo-tries-again', title: 'Dayo Tries Again', level: S, cats: ['character-growth', 'emotional'], min: 2,
    synopsis: 'Dayo’s tower keeps falling down. Will Dayo give up?',
    pages: ['Dayo builds a tall tower. One block, two blocks, three blocks, four.', 'Crash! The tower falls down. Dayo frowns.', 'Then Dayo takes a deep breath. “I will try again.”', 'One block, two blocks, three blocks, four… and five! The tower stands tall. Dayo smiles.'] },
  { slug: 'tomi-and-the-grumpy-cloud', title: 'Tomi and the Grumpy Cloud', level: S, cats: ['emotional', 'family-friendship'], min: 2,
    synopsis: 'Tomi has a grumpy grey cloud inside. Mama knows just what to do.',
    pages: ['Tomi has a grumpy cloud inside. It is grey. It is heavy.', 'Mama sits close. “Tell me about your cloud,” she says.', 'Tomi talks. The cloud gets smaller. Mama gives a big, warm hug.', 'Now the cloud is gone. The sun is out, inside and outside. Tomi feels light.'] },
  { slug: 'mamas-blue-cloth', title: 'Mama’s Blue Cloth', level: S, cats: ['culture-history', 'family-friendship'], min: 2,
    synopsis: 'Mama makes a beautiful blue cloth the way her people have always done.',
    pages: ['Mama has a big pot of dye. The dye is deep blue.', 'She ties the cloth in knots. She paints it with starch. Dip, dip, dip!', 'The cloth dries in the sun. Look! There are circles and waves.', 'Mama wraps it round Funmi. “This is adire,” says Mama. “Our people have made it for a long, long time.”'] },
  { slug: 'ada-says-thank-you', title: 'Ada Says Thank You', level: S, cats: ['faith'], min: 2,
    synopsis: 'Every morning, Ada and her family stop to say thank you.',
    pages: ['Morning comes. The sun is warm. Ada wakes up.', 'Mama and Papa fold their hands. It is time for the family’s morning prayer.', '“Thank you for the food,” Ada whispers. “Thank you for my family.”', 'Ada feels calm and glad inside. A thankful heart is a happy heart.'] },
  { slug: 'who-took-the-mango', title: 'Who Took the Mango?', level: S, cats: ['discovery-science', 'family-friendship'], min: 2,
    synopsis: 'The big mango is gone! Kemi follows the clues to find out who took it.',
    pages: ['Uh-oh! The big mango is gone. Only a little yellow peel is left.', 'Kemi looks closely. Small, sticky footprints go across the floor.', 'The footprints go under the table. Kemi peeks. Who is there?', 'It is Baby Bola, with a sticky face and a big smile! Mystery solved.'] },
  { slug: 'dedes-big-glass-of-water', title: 'Dede’s Big Glass of Water', level: S, cats: ['health-wellbeing', 'nature'], min: 2,
    synopsis: 'Dede plays all day in the sun. What does his body need?',
    pages: ['Dede plays in the hot sun. Run, jump, spin! Soon he is very tired.', 'His mouth is dry. His head feels heavy. “I need a drink,” says Dede.', 'Glug, glug, glug. Dede drinks a big glass of cool water.', 'Now Dede feels strong again. Water helps his body. Off he goes to play!'] },
  { slug: 'kofi-kicks-the-ball', title: 'Kofi Kicks the Ball', level: S, cats: ['sports', 'family-friendship'], min: 2,
    synopsis: 'Kofi has a bright round ball and lots of friends to play with.',
    pages: ['Kofi has a round ball. It is bumpy and bright.', 'Kick! The ball rolls. Kick! The ball rolls and rolls.', 'Kofi’s friends come to play. “Pass it to me!” they call.', 'Pass, kick, goal! Everyone cheers. Playing together is the best.'] },

  // ---------- Spark ----------
  { slug: 'sade-and-the-new-neighbour', title: 'Sade and the New Neighbour', level: P, cats: ['family-friendship'], min: 3,
    synopsis: 'A new boy has moved in next door, and he does not know anyone. Sade decides to say hello.',
    pages: [
      'A truck stopped outside the yellow house next door. Sade watched from her window. A boy stepped out. He held a toy car and looked very small.',
      'At school the next day, the boy sat alone. His name was Emeka. He had moved from far away and he did not know anyone. Sade felt a tug in her chest.',
      'At break time, Sade carried her ball across the playground. “Do you want to play?” she asked. Emeka’s face lit up like a lamp.',
      'They played catch until the bell rang. Emeka laughed so loudly that other children came to join. Soon there were six of them, all running and shouting.',
      'After school, Sade and Emeka walked home together. “You are my first friend here,” said Emeka. “And I’m glad you are my new neighbour,” said Sade.'],
    words: [{ w: 'neighbour', m: 'a person who lives close to you', e: 'My neighbour waved to me from her gate.', p: 5 }],
    puzzle: ['SADE', 'EMEKA', 'TRUCK', 'SCHOOL', 'BALL', 'FRIEND', 'NEIGHBOUR', 'CATCH'] },
  { slug: 'zuri-and-the-worry-jar', title: 'Zuri and the Worry Jar', level: P, cats: ['emotional', 'family-friendship'], min: 3,
    synopsis: 'Zuri’s tummy is full of tangled worries before the school play. Grandma has a magic jar.',
    pages: [
      'Zuri had a tummy full of tangled thoughts. Would she forget her lines in the school play? Would everyone laugh? The thoughts twisted round and round.',
      'Grandma found her sitting on the step. “What a heavy face,” said Grandma. “Come, I have something for you.” She took down an old glass jar.',
      '“This is a worry jar,” said Grandma. “Tell each worry to the jar, then put on the lid.” Zuri whispered, “I might forget my lines.” She dropped a paper star inside.',
      'One by one, Zuri named her worries. The jar filled with little paper stars. Her tummy grew quiet, and her thoughts untangled like loose string.',
      'On the day of the play, Zuri forgot one line. She smiled, took a breath, and found the next. The crowd clapped loudly. The jar sat on her shelf, waiting for the next worry.'],
    words: [{ w: 'tangled', m: 'twisted together in a knot', e: 'My headphone wire got tangled in my bag.', p: 1 }],
    puzzle: ['ZURI', 'GRANDMA', 'JAR', 'WORRY', 'STAR', 'PLAY', 'BREATH', 'TANGLED'] },
  { slug: 'grandpas-story-under-the-moon', title: 'Grandpa’s Story Under the Moon', level: P, cats: ['culture-history', 'family-friendship', 'bedtime'], min: 3,
    synopsis: 'Under the bright moon, Grandpa tells the children why our stories matter.',
    pages: [
      'When the moon was round and bright, Grandpa dragged his stool outside. The children of the compound ran to sit at his feet. It was story time.',
      '“Long ago,” began Grandpa, “our ancestors lived by the river. They had no phones, no television, no electric lights. But they had stories.”',
      'He told how the elders kept time by the sun, and how the drummers sent messages across the hills. The children listened with wide, round eyes.',
      '“Why did they tell stories?” asked little Ife. “So no one would forget,” said Grandpa. “A story carries our past from one hand to the next, like a gourd of water.”',
      'That night, Ife lay in bed and whispered the story to her teddy. One day, she thought, I will tell it to my own children, under the same bright moon.'],
    words: [{ w: 'ancestors', m: 'the people in your family who lived long before you', e: 'Our ancestors built this village by the river.', p: 2 }],
    puzzle: ['GRANDPA', 'MOON', 'STORY', 'RIVER', 'DRUMMERS', 'ELDERS', 'IFE', 'ANCESTORS'] },
  { slug: 'zainab-and-the-giving-table', title: 'Zainab and the Giving Table', level: P, cats: ['faith', 'family-friendship'], min: 3,
    synopsis: 'During the month of fasting, Zainab and her family set a table for everyone on the street.',
    pages: [
      'It was the month of fasting, and every evening the smell of warm bread drifted from Zainab’s kitchen. Her family waited for the sun to set before they ate.',
      '“Today we will share,” said Mama. She packed dates, rice and sweet drinks into little bags. Zainab carried the biggest bag with both hands.',
      'They set a long table outside the gate. Soon tired travellers, the shoemaker and the children from the next street came to sit.',
      '“Why do we share?” asked Zainab. “Because we have been given much,” said Mama. “A generous heart makes the whole street feel like family.”',
      'When the call to prayer rose into the evening air, everyone fell quiet together. Zainab felt warm and glad, full of thanks. Her hands were empty, but her heart was full.'],
    words: [{ w: 'generous', m: 'happy to give and share with others', e: 'He was generous and gave half his lunch away.', p: 4 }],
    puzzle: ['ZAINAB', 'MAMA', 'TABLE', 'DATES', 'RICE', 'SHARE', 'FASTING', 'GENEROUS'] },
  { slug: 'the-case-of-the-missing-shoe', title: 'The Case of the Missing Shoe', level: P, cats: ['discovery-science', 'family-friendship'], min: 3,
    synopsis: 'Tobe can only find one shoe. Time to follow the clues and solve the case!',
    pages: [
      'On Saturday morning, Tobe could only find one shoe. The left one was gone! “Time to be a detective,” he said, and he put on his best frowning face.',
      'First clue: a muddy paw print by the door. Second clue: a trail of tiny bits of rubber across the yard. Tobe followed them, slowly and quietly.',
      'The trail led to the old mango tree. A branch rustled. Tobe held his breath. Something small and brown was hiding behind the roots.',
      'It was Pepper, the puppy, curled up with the shoe between her paws. She had chewed the lace into a soggy knot. She wagged her tail.',
      'Tobe laughed and scooped her up. “Case closed,” he said. From then on, he kept his shoes on the high shelf, out of Pepper’s reach.'],
    words: [{ w: 'clue', m: 'a small sign that helps you find an answer', e: 'The muddy footprint was the first clue.', p: 2 }],
    puzzle: ['TOBE', 'SHOE', 'CLUE', 'DETECTIVE', 'TRAIL', 'PEPPER', 'PUPPY', 'MANGO'] },
  { slug: 'chika-and-the-rainbow-plate', title: 'Chika and the Rainbow Plate', level: P, cats: ['health-wellbeing', 'family-friendship'], min: 3,
    synopsis: 'Chika only wants biscuits and sweets, until Auntie Nkem shows her how to paint a plate like a rainbow.',
    pages: [
      'Chika loved biscuits and sweets. Biscuits for breakfast, sweets after school. But lately she felt tired, and her legs grew slow when she played.',
      '“Let’s paint your plate like a rainbow,” said Auntie Nkem. “Red tomatoes, orange carrots, yellow plantain, green ugu leaves.” Chika giggled.',
      'Chika tried each colour. The tomatoes were juicy. The plantain was sweet. Even the green leaves tasted good with a little pepper sauce.',
      '“Colourful food is nutritious,” said Auntie Nkem. “It gives your body the power to run, think and grow.” Chika flexed her arms like a strong wrestler.',
      'A week later, Chika raced her cousins to the gate, and she won! She still enjoyed a sweet now and then, but her plate stayed a rainbow.'],
    words: [{ w: 'nutritious', m: 'full of the good things your body needs to grow strong', e: 'Beans and vegetables are nutritious food.', p: 4 }],
    puzzle: ['CHIKA', 'PLATE', 'RAINBOW', 'CARROTS', 'PLANTAIN', 'TOMATOES', 'GREEN', 'SWEETS'] },
  { slug: 'ngozi-and-the-relay-race', title: 'Ngozi and the Relay Race', level: P, cats: ['sports', 'character-growth'], min: 3,
    synopsis: 'Ngozi runs the last leg of the relay. Her team is far behind. Can she catch up?',
    pages: [
      'Sports day had come! Ngozi stood on the track with three teammates. She was last in the line, holding a shiny red baton.',
      'The whistle blew. The first runner dashed off. Cheers rose like a wave. Ngozi bounced on her toes, her heart thumping.',
      'When the baton reached her hand, Ngozi was far behind. “Run, Ngozi!” her teammates yelled. She leaned forward and her feet flew.',
      'She passed one runner, then another. The finish line grew closer. Her chest burned, but she did not slow down.',
      'Ngozi crossed the line in second place. Her team hugged her. “We did it together,” she panted. Winning was nice, but running as a team felt even better.'],
    words: [{ w: 'baton', m: 'a short stick that runners pass to each other in a relay race', e: 'She held the baton tightly and ran.', p: 1 }],
    puzzle: ['NGOZI', 'CHEERS', 'BATON', 'TRACK', 'WHISTLE', 'TEAM', 'RUNNER', 'FINISH'] },

  // ---------- Seeker ----------
  { slug: 'the-sunday-long-table', title: 'The Sunday Long Table', level: K, cats: ['family-friendship'], min: 5,
    synopsis: 'Two cousins who squabble about everything learn what Grandma’s long table is really for.',
    pages: [
      'Every first Sunday of the month, the whole family came to Grandma Nneka’s house. By noon the compound was a bustle of noise: cousins racing down the steps, aunties arguing happily over the jollof, and uncles setting up plastic chairs in long, wobbly rows. Chinedu loved it and dreaded it in equal parts.',
      'He dreaded it because of Uche. Uche was his cousin, his exact same height, and his most reliable rival. They argued about everything: who sat where, who got the last piece of chicken, who was better at football. This Sunday, the squabble began before Chinedu had even taken off his shoes.',
      '“You always cheat at ludo,” snapped Uche. “You only win because you cannot count,” Chinedu shot back. Voices rose. Grandma Nneka appeared in the doorway, wiping her hands on her wrapper. She did not shout. She simply pointed to the kitchen and said, “Both of you. Groundnuts. Now.”',
      'Side by side at the small table, the boys cracked groundnut shells in grumpy silence. Dust tickled their noses. Chinedu sneezed. Uche sneezed. A giggle escaped Uche, then a snort from Chinedu, and soon they were laughing so hard they had to put down the bowl. “Your face!” said Uche. “Your face!” said Chinedu.',
      'When the food was ready, the long table stretched from the front door to the back gate, covered in bowls and steaming pots. Grandma Nneka sat at the head and the family joined hands. “A table is only long,” she said, “because there is room for everyone, even the people who annoy us.” Chinedu looked across at Uche and grinned.',
      'That afternoon, the two cousins formed one team against the uncles at football, and lost spectacularly. They did not mind. When the sun set and the reunion ended, Chinedu found that he was already counting the days until the next first Sunday, and the next squabble, and the next long table.'],
    words: [{ w: 'bustle', m: 'busy, noisy activity with lots of people moving about', e: 'The market was a bustle of shoppers and sellers.', p: 1 },
            { w: 'squabble', m: 'a small, noisy quarrel about something unimportant', e: 'The twins had a squabble over the last biscuit.', p: 2 },
            { w: 'reunion', m: 'a happy meeting of people who have not been together for a while', e: 'The whole family came to the reunion.', p: 6 }],
    puzzle: ['CHINEDU', 'UCHE', 'GRANDMA', 'TABLE', 'SUNDAY', 'COUSINS', 'FOOTBALL', 'REUNION'] },
  { slug: 'ifeoma-and-the-lost-coin-purse', title: 'Ifeoma and the Lost Coin Purse', level: K, cats: ['character-growth'], min: 5,
    synopsis: 'Ifeoma finds a purse full of money. Nobody is watching. What will she do?',
    pages: [
      'On the way home from school, Ifeoma kicked a stone along the dusty road. The sun was low, and her stomach was growling. Then, in the gutter beside the market, something small and shiny caught her eye. She bent down. It was a purse, thick and heavy, fastened with a brass clasp.',
      'Inside lay a roll of banknotes, more money than Ifeoma had ever held. Her mother’s shoe had split last week. Her school fees were late. For a long, quiet moment, she was tempted. Nobody was watching. Nobody would ever know.',
      'But the purse had a name stitched inside the flap: Mama Titi, Provisions. Ifeoma knew her. Mama Titi sold tomatoes and soap from a tiny stall near the bus stop, and she woke before dawn to carry her goods. This money was her whole week.',
      'Ifeoma hesitated, the purse trembling in her hands. Then she thought of Mama Titi’s tired smile, and she began to run. She ran past the barber, past the church, past the bus stop, until she saw the stall, and Mama Titi on her knees, searching the ground and wiping her eyes.',
      '“Ma,” Ifeoma panted. “I found this.” Mama Titi stared at the purse, then at the girl, then burst into tears of joy. She did not count a single note. She simply hugged Ifeoma so tightly that her feet left the ground. “God bless you, my daughter. Many would have kept it.”',
      'That evening, Ifeoma told her mother everything. Her mother was quiet for a moment, then gave a proud nod. “Shoes can be mended,” she said, “but integrity is something you carry for life.” The next morning, Mama Titi sent a bag of fresh tomatoes and a note that said, “Thank you, my brave girl.” Ifeoma had never felt so rich.'],
    words: [{ w: 'tempted', m: 'wanting very much to do something you know you should not do', e: 'He was tempted to eat the cake before dinner.', p: 2 },
            { w: 'hesitated', m: 'paused for a moment because you were not sure what to do', e: 'She hesitated at the edge of the deep pool.', p: 4 },
            { w: 'integrity', m: 'doing the right thing, even when nobody is watching', e: 'A person of integrity always tells the truth.', p: 6 }],
    puzzle: ['IFEOMA', 'PURSE', 'MARKET', 'MONEY', 'STALL', 'TOMATOES', 'TEMPTED', 'INTEGRITY'] },
  { slug: 'folake-and-the-old-lagos-map', title: 'Folake and the Old Lagos Map', level: K, cats: ['culture-history'], min: 5,
    synopsis: 'In the attic Folake finds a faded map of Eko, and learns where her family comes from.',
    pages: [
      'On a rainy afternoon, Folake climbed into the attic of her grandmother’s house in Lagos. Behind a stack of old suitcases she found a flat wooden box. Inside, wrapped in cloth, lay a paper map so faded that the ink had turned the colour of weak tea.',
      '“That’s Eko,” said Grandma, when Folake carried the box downstairs. “That is what many of our people called Lagos long ago, when the city was mostly an island on the lagoon.” She traced the paper with her finger. Here were tiny drawings of canoes and market stalls and a long line of palm trees.',
      '“Canoes carried people across the water,” Grandma explained. “Fishermen sold their catch at dawn. Merchants arrived from far away with beads, cloth and spices, and the markets rang with a dozen languages.” Folake closed her eyes and tried to hear it: paddles, bargaining, laughter, the slap of fish.',
      '“Your great-grandfather drew this map,” Grandma said softly. “He wanted his children to know where we came from.” Folake looked again. In the corner, in neat handwriting, was a little house marked with a star and her family’s name. We have been here, she thought, for a very long time.',
      'The next day, Folake and Grandma took a bus to Lagos Island. The streets were crowded with traffic and tall buildings now, but they found an old market and a stretch of lagoon where small boats still bobbed. Grandma pointed. “Somewhere near this corner,” she said, “is where our house once stood.”',
      'Back home, Folake framed the map and hung it above her bed. At school she told her class about Eko and the merchants and the canoes, and soon every child wanted to ask their grandparents about their own heritage. Folake smiled. A map shows where places are, she realised, but a story shows where you belong.'],
    words: [{ w: 'faded', m: 'having lost its bright colour over time', e: 'The sun had faded the old curtains.', p: 1 },
            { w: 'merchants', m: 'people who buy and sell goods for a living', e: 'Merchants carried cloth and spices to the market.', p: 3 },
            { w: 'heritage', m: 'the traditions and history passed down in a family or people', e: 'Telling stories is part of our heritage.', p: 6 }],
    puzzle: ['FOLAKE', 'LAGOS', 'MAP', 'LAGOON', 'CANOES', 'MERCHANTS', 'MARKET', 'HERITAGE'] },
  { slug: 'the-street-of-two-festivals', title: 'The Street of Two Festivals', level: K, cats: ['faith', 'family-friendship'], min: 5,
    synopsis: 'Christmas and Eid fall in the same month on Palm Street, and two neighbours discover what they share.',
    pages: [
      'On Palm Street, two families lived side by side. Tunde’s family went to church on Sundays and sang loudly in the front pew. Amina’s family went to the mosque on Fridays and rose before dawn to pray. The children, Tunde and Amina, had been best friends since they could crawl.',
      'This year, a strange thing happened. Christmas and Eid fell in the same month. Palm Street buzzed with preparation. Tunde’s mother hung paper stars on the gate. Amina’s father brought home bags of sweets and bright new cloth. The two sets of decorations glittered across the same fence.',
      '“Do you think we should do things differently?” Tunde asked one evening, nervous. “Our festivals are not the same.” Amina shrugged. “No, they’re not,” she said. “But my mother says that when you respect someone’s joy, it grows twice as big.” Tunde thought about that all the way home.',
      'On the morning of Eid, Tunde’s family stood at their gate and waved as Amina’s family set off in their best clothes. Later, Amina’s mother knocked with a covered dish of fragrant rice. “Eid Mubarak,” she smiled. Tunde’s mother pressed a loaf of fresh bread into her hands in return.',
      'A few weeks later, on Christmas morning, the exchange happened again. Amina’s family arrived at Tunde’s door with warm wishes, and Tunde’s mother heaped their plates with jollof and fried plantain. Both families squeezed around one long table, laughing at each other’s jokes and sharing the story of each family’s tradition.',
      'Late that night, Tunde and Amina sat on the front step, watching the paper stars and the colourful lamps blink side by side. “We pray differently,” said Tunde, “but it feels the same when we say thank you.” Amina nodded. On Palm Street, the word was harmony, and it needed no translation.'],
    words: [{ w: 'respect', m: 'treating someone or something as important and showing you care', e: 'We show respect by listening when others speak.', p: 3 },
            { w: 'tradition', m: 'a custom that is passed down in a family or community', e: 'Singing at dinner is a tradition in our house.', p: 5 },
            { w: 'harmony', m: 'living or working together in a peaceful, friendly way', e: 'The neighbours lived in harmony for many years.', p: 6 }],
    puzzle: ['TUNDE', 'AMINA', 'CHURCH', 'MOSQUE', 'EID', 'CHRISTMAS', 'HARMONY', 'RESPECT'] },
  { slug: 'halima-and-the-tired-week', title: 'Halima and the Tired Week', level: K, cats: ['health-wellbeing', 'bedtime'], min: 5,
    synopsis: 'Halima is exhausted all week. Her teacher helps her find out why, and what her body really needs.',
    pages: [
      'By Wednesday, Halima was exhausted. She had stayed up late every night that week, reading under the blanket with a torch. In class her eyes kept closing. At break she sat on the bench while her friends played, too weary to join them.',
      '“You look like a wilted flower,” said her teacher, Mrs Bello, kindly. She pulled up a chair beside her. “What time do you go to bed, Halima?” Halima mumbled something about midnight. Mrs Bello nodded. “Your body is like a phone,” she said. “It needs time to charge.”',
      'That evening, Halima told her mother everything. Together they made a new routine. Supper early. A short walk afterwards. A warm bath. Ten minutes of reading, and then lights out, with the book safely under the pillow until morning.',
      'The first night was hard. Halima’s head was full of the next chapter. But she breathed slowly, in and out, and counted the stars through her window until the counting stopped. Morning came all at once, golden and bright.',
      'By the end of the week, Halima felt different. She jumped out of bed. Her porridge tasted better. In the playground she ran, skipped and shouted with her friends, and she did not once feel the heavy fog that had followed her.',
      'On Saturday, Halima made a poster for her class: Water. Food. Play. Sleep. Four things that restore your body every day. She stuck it on the wall and, underneath, in small letters, she wrote: Reading is better when you are awake.'],
    words: [{ w: 'exhausted', m: 'so tired that you have no energy left', e: 'After the long walk, we were exhausted.', p: 1 },
            { w: 'routine', m: 'the things you do in the same order every day', e: 'Brushing my teeth is part of my bedtime routine.', p: 3 },
            { w: 'restore', m: 'to bring something back to the way it was', e: 'A good night’s sleep will restore your energy.', p: 6 }],
    puzzle: ['HALIMA', 'TEACHER', 'ROUTINE', 'SLEEP', 'WATER', 'PORRIDGE', 'EXHAUSTED', 'RESTORE'] },
  { slug: 'the-last-lap', title: 'The Last Lap', level: K, cats: ['sports', 'character-growth'], min: 5,
    synopsis: 'In the final race of the term, Bisi has to choose between winning and doing the right thing.',
    pages: [
      'The school stadium was roaring. Bisi stood at the starting line of the final race of the term, her heartbeat loud in her ears. She had trained every morning for months, running laps round the football field while the sky was still pink.',
      'Beside her stood Ladi, the fastest girl in the school, who had won this race three times. Ladi grinned and bumped Bisi’s fist. “Good luck,” she said, and Bisi realised, with a little surprise, that she meant it.',
      'The whistle blew. For the first lap, Bisi stayed close to the leaders, saving her stamina. Her legs felt light. By the second lap, they felt like logs. By the third, every breath was a fiery scrape, and the crowd blurred into a roar of colour.',
      'On the last lap, Ladi surged ahead. Bisi ran after her, determined, teeth clenched. Then, halfway round the bend, Ladi’s foot caught on the track and she tumbled onto the red dust. The stadium gasped.',
      'Bisi’s feet carried her forward. The finish line was straight ahead, a white ribbon, an open road to victory. But she slowed. She turned. She ran back and held out her hand. “Come on,” she said. “We’ll finish together.” Ladi, limping, took it.',
      'They crossed the line side by side, a half-step behind the runner who had taken first place. The crowd stood and cheered louder than for any winner. Their coach hugged them both. “That,” she said, “is sportsmanship. It is worth more than any medal.” Bisi’s legs still ached, but her heart felt light.'],
    words: [{ w: 'stamina', m: 'the strength to keep going for a long time without getting tired', e: 'Running every day gave her great stamina.', p: 3 },
            { w: 'determined', m: 'having made up your mind not to give up', e: 'He was determined to finish the puzzle.', p: 4 },
            { w: 'sportsmanship', m: 'playing fairly and being kind, whether you win or lose', e: 'Shaking hands after the game shows good sportsmanship.', p: 6 }],
    puzzle: ['BISI', 'LADI', 'STADIUM', 'STAMINA', 'WHISTLE', 'FINISH', 'MEDAL', 'TRACK'] },

  // ---------- added 2026-10-13 (second round): Media & Technology, Business and Bedtime at every level ----------
  { slug: 'grandma-on-the-screen', title: 'Grandma on the Screen', level: S, cats: ['media-technology', 'family-friendship'], min: 2,
    synopsis: 'Grandma lives far away, but a tablet brings her right into the room.',
    pages: ['Ring, ring! The tablet is ringing. Look, it is Grandma!', 'Grandma is far away. But Grandma is on the screen. She waves. Nia waves back.', '“Hello, my darling!” says Grandma. Nia shows her a new drawing.', 'Grandma claps and claps. “Beautiful!” The screen is small, but the love is big.'] },
  { slug: 'bola-sells-oranges', title: 'Bola Sells Oranges', level: S, cats: ['business'], min: 2,
    synopsis: 'Bola sets up a little stall by the road and sells her sweet oranges.',
    pages: ['Bola has a basket of oranges. They are round and sweet.', 'She sits by the road. “Oranges! Fresh oranges!” she calls.', 'A lady stops. She gives Bola two coins. Bola gives her two oranges.', 'Bola counts her coins. Clink, clink, clink! She saves one for tomorrow.'] },
  { slug: 'goodnight-little-star', title: 'Goodnight, Little Star', level: S, cats: ['bedtime'], min: 2,
    synopsis: 'The sun goes to sleep, and Zara says goodnight to everyone she loves.',
    pages: ['The sun goes to sleep. Zara climbs into bed.', 'Goodnight, birds in the tree. Goodnight, goat in the barn.', 'Goodnight, Mama. Goodnight, Papa. Goodnight, big round moon.', 'A little star blinks at the window. Zara blinks back, once, twice… and sleeps.'] },
  { slug: 'uzo-and-the-robot-who-followed-steps', title: 'Uzo and the Robot Who Followed Steps', level: P, cats: ['media-technology', 'discovery-science'], min: 3,
    synopsis: 'Uzo’s new robot will not walk when he tells it to. Auntie Ify shows him how to speak its language.',
    pages: [
      'Uzo had a small robot kit with wheels, a tiny screen and a blinking light. He named his robot Bolt. “Walk!” said Uzo. Bolt did not move.',
      'Auntie Ify, who worked with computers, laughed. “Robots do not understand words,” she said. “You have to program them. That means giving clear steps, one at a time.”',
      'Uzo made a plan on paper: go forward, turn left, go forward, stop. He tapped each step into the tablet. His thumb shook with excitement.',
      'Bolt rolled forward, turned left, and kept on rolling until it bumped into the wall. Uzo frowned. “I forgot to tell it how far to go,” he said.',
      'Uzo fixed his steps and added the distance. This time, Bolt stopped right at the door. “Mistakes are just clues,” said Auntie Ify. Uzo grinned and began a new program.'],
    words: [{ w: 'program', m: 'to give a computer or robot clear steps to follow', e: 'We learned to program a robot to dance.', p: 2 }],
    puzzle: ['UZO', 'BOLT', 'ROBOT', 'WHEELS', 'SCREEN', 'TABLET', 'PROGRAM', 'STEPS'] },
  { slug: 'amakas-akara-stand', title: 'Amaka’s Akara Stand', level: P, cats: ['business', 'family-friendship'], min: 3,
    synopsis: 'Amaka helps her mother sell hot akara by the roadside and learns what makes a business grow.',
    pages: [
      'Every Saturday, Amaka helped her mother fry akara at the roadside. Her job was to wrap the hot bean cakes in paper and say, “Good morning, welcome!”',
      'One morning, a tired man walked up. “How much?” he asked. Amaka smiled. “Just one hundred naira, sir. Fresh and hot.” He bought three and thanked her.',
      'Soon a line of people waited. Amaka counted the money carefully and gave the right change. “A good customer is a friend,” her mother whispered. “Treat everyone kindly.”',
      'At noon, the pot was empty. Amaka and her mother counted their coins and set some aside for tomorrow’s beans and oil. “That is how a business grows,” said Mother.',
      'Amaka tied her apron and made a promise. One day, she would have her own shop with a big bright sign. But for now, she was happy to wrap akara, one smile at a time.'],
    words: [{ w: 'customer', m: 'a person who buys something from a shop or stall', e: 'The customer paid and said thank you.', p: 3 }],
    puzzle: ['AMAKA', 'AKARA', 'WRAP', 'CUSTOMER', 'MONEY', 'CHANGE', 'COINS', 'SHOP'] },
  { slug: 'chidi-and-the-village-radio', title: 'Chidi and the Village Radio', level: K, cats: ['media-technology', 'culture-history'], min: 5,
    synopsis: 'Chidi mends an old radio and gives his village a voice, and learns that a reliable voice matters most.',
    pages: [
      'In the village of Umuoke, news travelled slowly. If the bridge washed away, or the market day changed, people only found out when a neighbour happened to walk by. Chidi, who loved gadgets, thought this was ridiculous. “What we need,” he told his grandfather, “is our own radio.”',
      'His grandfather chuckled and pointed to a dusty box in the corner. Inside lay a broken radio and a coil of copper wire. “Your uncle built this,” he said. “Fix it, if you can.” For two weeks, Chidi studied, tested and tinkered, learning how each part carried a tiny signal through the air.',
      'At last, the old radio crackled. Chidi climbed the mango tree and tied a long wire to the highest branch to make an antenna. Static hissed, then a faint voice spoke, thin and far away. The whole family gathered round and cheered.',
      'But listening was not enough. Chidi wanted to send. With his uncle’s old microphone, he set up a small station in the school store room. The next Saturday, he made his first broadcast to the village: the market day, the weather, and a call for volunteers to fix the bridge.',
      'By evening, dozens of villagers had arrived with shovels and bamboo poles. The bridge was mended before dark. Old Mama Ngozi, who could not walk far, said, “Now even I know what is happening in Umuoke.” She asked Chidi to read out the birthdays and the proverbs, too.',
      'Soon the little station became the heartbeat of the village. Chidi learned that technology is only as good as the people it helps. The news he shared had to be careful and true, because everyone listened. A reliable voice, he decided, was worth more than any gadget.'],
    words: [{ w: 'antenna', m: 'a wire or rod that sends or catches radio signals', e: 'The radio needs an antenna to catch the signal.', p: 3 },
            { w: 'broadcast', m: 'to send out a programme or message by radio or television', e: 'The station will broadcast the news at noon.', p: 4 },
            { w: 'reliable', m: 'able to be trusted to do what is right or true', e: 'A reliable friend always keeps a promise.', p: 6 }],
    puzzle: ['CHIDI', 'VILLAGE', 'RADIO', 'ANTENNA', 'SIGNAL', 'BROADCAST', 'BRIDGE', 'NEWS'] },
  { slug: 'femi-and-the-kite-business', title: 'Femi and the Kite Business', level: K, cats: ['business', 'character-growth'], min: 5,
    synopsis: 'Femi turns his love of kites into a small business, and learns about costs, profit and sharing.',
    pages: [
      'Every harmattan season, the sky above Femi’s street filled with kites. Femi loved them, but the shop-bought ones cost too much. So he started making his own from old paper, thin sticks and a bit of flour paste. His first kite flew higher than all the others.',
      '“Can you make me one?” asked the boy next door. Then another friend asked. Then three more. Femi realised he had something people wanted. He sat on the step with a notebook and began to plan like a real business owner.',
      'He made a small budget: how much the paper cost, how much the sticks cost, and how much string he needed. “If I charge too little, I’ll lose money,” he muttered. “If I charge too much, nobody will buy.” He settled on a fair price.',
      'By Saturday, Femi had sold twelve kites. He counted his coins into two piles: the cost of his materials, and what was left over. The leftover pile was his profit. It was small, but it was real, and it was his.',
      'He could have spent it all on sweets. Instead, he decided to invest some of it, buying better paper and bright paint so his kites would look special. His sister Ronke offered to help paint, and he happily gave her a share of the work and the earnings.',
      'By the end of the harmattan, Femi’s kites were flying all over the neighbourhood. He had saved enough for a school bag. The best part, he told Ronke, was not the money. It was seeing a kite he had made dance above the rooftops.'],
    words: [{ w: 'budget', m: 'a plan for how much money you will spend and save', e: 'Mum made a budget for the week’s shopping.', p: 3 },
            { w: 'profit', m: 'the money you have left after paying all your costs', e: 'She sold the mangoes and made a small profit.', p: 4 },
            { w: 'invest', m: 'to use money or time now to make something better later', e: 'He chose to invest in a better pair of boots.', p: 5 }],
    puzzle: ['FEMI', 'KITES', 'HARMATTAN', 'BUDGET', 'PROFIT', 'INVEST', 'RONKE', 'PAPER'] },
  { slug: 'amara-and-the-sleepless-owl', title: 'Amara and the Sleepless Owl', level: K, cats: ['bedtime', 'nature'], min: 5,
    synopsis: 'Amara cannot sleep, so she keeps a lonely owl company on the night side of the window.',
    pages: [
      'Amara could not sleep. She lay in bed counting cracks in the ceiling while the moon peeped through the curtain. Outside, something hooted, a soft, round, wide-awake sound. “Who’s that?” she whispered, and tiptoed to the window.',
      'On a branch of the neem tree sat a small owl with enormous golden eyes. “Hoo,” it said. “I am nocturnal. That means I sleep in the day and wake at night.” Amara giggled. “For me, the night is for sleeping.” The owl tilted its head as if it did not believe her.',
      '“I have a problem,” the owl sighed. “Everyone is asleep and I am lonely.” Amara thought. “I will keep you company until I am sleepy,” she said. She slipped on her slippers and sat on the window ledge with a blanket round her shoulders.',
      'They talked in whispers about moths and moonbeams, about the baobab that had stood for a thousand years, and about what the night smelled like: wet earth and jasmine. Amara noticed that her words were coming slower. Her eyelids felt heavy.',
      '“You are growing drowsy,” said the owl kindly. “Shall I sing you a lullaby?” It hummed a low, gentle tune that sounded like wind in the leaves and water in a stream. Amara’s head sank against the blanket.',
      'In the morning, Amara woke in her own bed with no memory of climbing in. On the windowsill lay one soft grey feather. She smiled and tucked it under her pillow. That night, she fell asleep before the moon rose, and far away, a small owl hooted its goodnight.'],
    words: [{ w: 'nocturnal', m: 'awake and busy at night, and asleep during the day', e: 'Bats are nocturnal animals.', p: 2 },
            { w: 'drowsy', m: 'feeling sleepy and slow', e: 'The warm room made him drowsy.', p: 5 },
            { w: 'lullaby', m: 'a soft, gentle song that helps someone fall asleep', e: 'Mama sang a lullaby to the baby.', p: 5 }],
    puzzle: ['AMARA', 'OWL', 'MOON', 'NEEM', 'BLANKET', 'WINDOW', 'LULLABY', 'FEATHER'] },
];

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const maxW = { sunrise: 0, spark: 1, seeker: 3 };

export function validate() {
  const slugs = new Set();
  for (const s of stories) {
    const where = s.slug;
    if (slugs.has(s.slug)) throw new Error(`dup slug ${where}`); slugs.add(s.slug);
    const words = s.words ?? [];
    if (words.length !== maxW[s.level]) throw new Error(`${where}: needs ${maxW[s.level]} words, has ${words.length}`);
    for (const w of words) {
      const t = s.pages[w.p - 1] ?? '';
      if (!new RegExp(`(^|[^A-Za-z])${w.w}([^A-Za-z]|$)`, 'i').test(t)) throw new Error(`${where}: word "${w.w}" not on page ${w.p}`);
    }
    const pz = s.puzzle ?? [];
    if (s.level !== 'sunrise') {
      if (pz.length < 3 || pz.length > 8) throw new Error(`${where}: puzzle word count ${pz.length}`);
      const all = s.pages.join(' ').toUpperCase();
      for (const z of pz) {
        if (!/^[A-Z]{3,10}$/.test(z)) throw new Error(`${where}: bad puzzle word ${z}`);
        if (!all.includes(z)) throw new Error(`${where}: puzzle word ${z} not in story`);
      }
    }
    const bad = /\b(age[sd]?|years? old|year-old|toddler|kindergarten)\b/i;
    if (bad.test(s.pages.join(' ') + s.synopsis + s.title)) throw new Error(`${where}: age text`);
  }
}

export function sql(s, i) {
  const pages = s.pages.map((t, n) => `(${n + 1}, ${q(`https://picsum.photos/seed/${s.slug}${n + 1}/800/600`)}, ${q(t)})`).join(',\n    ');
  const words = (s.words ?? []).map((w, n) => `(${q(w.w)}, ${q(w.m)}, ${q(w.e)}, ${w.p}, ${n + 1})`).join(',\n    ');
  const puzzle = (s.puzzle ?? []).length ? `array[${s.puzzle.map(q).join(',')}]::text[]` : `'{}'::text[]`;
  return `do $$
declare sid uuid;
begin
  if exists (select 1 from stories where slug = ${q(s.slug)}) then return; end if;
  insert into stories (slug, title, synopsis, cover_url, author_id, reading_level, status, is_free, reading_minutes, published_at, puzzle_words)
  values (${q(s.slug)}, ${q(s.title)}, ${q(s.synopsis)}, ${q(`https://picsum.photos/seed/${s.slug}/600/800`)}, '00000000-0000-0000-0000-0000000000a1', '${s.level}', 'published', true, ${s.min}, now() - interval '${(stories.length - i) * 7} minutes', ${puzzle})
  returning id into sid;
  insert into story_pages (story_id, position, image_url, text) select sid, v.p, v.i, v.t from (values
    ${pages}) v(p, i, t);
${words ? `  insert into story_words (story_id, word, meaning, example, page_position, sort_order) select sid, v.w, v.m, v.e, v.p, v.o from (values
    ${words}) v(w, m, e, p, o);\n` : ''}  insert into story_categories (story_id, category_id) select sid, c.id from categories c where c.slug in (${s.cats.map(q).join(', ')});
end $$;`;
}

if (process.argv[1].endsWith('demo_stories.mjs')) {
  validate();
  const from = Number(process.argv[2] ?? 0), to = Number(process.argv[3] ?? stories.length);
  if (process.argv[2] === 'check') { console.log(`${stories.length} stories ok`); }
  else console.log(stories.slice(from, to).map((s, i) => sql(s, from + i)).join('\n'));
}
